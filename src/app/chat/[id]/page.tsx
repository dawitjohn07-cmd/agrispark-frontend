'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getInitials, PRODUCT_IMAGES_BUCKET, resolvePublicStorageUrl } from '@/lib/utils';

type MessageType = 'text' | 'image' | 'audio';

interface Message {
    id: string;
    message: string;
    message_type: MessageType;
    sender_id: string;
    sender_name: string;
    receiver_id: string;
    created_at: string;
}

interface Order {
    id: string;
    status: string;
    products?: { name: string };
    buyer_id: string;
    product_id: string;
}

interface UserProfile {
    id: string;
    full_name: string;
    avatar_url?: string | null;
    role?: string;
}

const CHAT_MEDIA_BUCKET = PRODUCT_IMAGES_BUCKET;

export default function OrderChat() {
    const router = useRouter();
    const params = useParams();
    const orderId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState<Order | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
    const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
    const [otherUserAvatarUrl, setOtherUserAvatarUrl] = useState('');
    const [messageText, setMessageText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState('');
    const [error, setError] = useState('');
    const [previewImageUrl, setPreviewImageUrl] = useState('');

    const imageInputRef = useRef<HTMLInputElement | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const mountedRef = useRef(false);
    const currentUserIdRef = useRef<string | null>(null);
    const chatChannelRef = useRef<any>(null);

    const hydrateSenderNames = async (rows: any[]) => {
        const senderIds = Array.from(new Set((rows || []).map((msg) => msg.sender_id))).filter(Boolean) as string[];
        let senderMap: Record<string, string> = {};

        if (senderIds.length) {
            const { data: usersData } = await supabase
                .from('users')
                .select('id, full_name')
                .in('id', senderIds);

            senderMap = Object.fromEntries((usersData || []).map((user: any) => [user.id, user.full_name || 'Unknown']));
        }

        return (rows || []).map((msg: any) => ({
            ...msg,
            message_type: (msg.message_type || 'text') as MessageType,
            sender_name: senderMap[msg.sender_id] || 'Unknown',
        }));
    };

    const loadMessages = async () => {
        const { data: messagesData, error: messagesError } = await supabase
            .from('messages')
            .select('id, message, message_type, sender_id, receiver_id, created_at')
            .eq('order_id', orderId)
            .order('created_at', { ascending: true });

        if (messagesError) throw messagesError;

        return hydrateSenderNames(messagesData || []);
    };

    const markMessagesAsRead = async () => {
        const receiverId = currentUserIdRef.current;
        if (!receiverId) return;

        await supabase
            .from('messages')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('order_id', orderId)
            .eq('receiver_id', receiverId)
            .eq('is_read', false);
    };

    const refreshMessages = async () => {
        const enrichedMessages = await loadMessages();
        if (mountedRef.current) {
            setMessages(enrichedMessages as Message[]);
            await markMessagesAsRead();
        }
    };

    const removeChatChannel = () => {
        if (chatChannelRef.current) {
            supabase.removeChannel(chatChannelRef.current);
            chatChannelRef.current = null;
        }
    };

    useEffect(() => {
        mountedRef.current = true;
        removeChatChannel();

        const setupRealtimeChannel = () => {
            removeChatChannel();

            const channel = supabase
                .channel(`order-chat-${orderId}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'messages',
                        filter: `order_id=eq.${orderId}`,
                    },
                    async () => {
                        if (mountedRef.current) await refreshMessages();
                    }
                )
                .subscribe();

            chatChannelRef.current = channel;
            return channel;
        };

        const fetchData = async () => {
            try {
                const { data: authData } = await supabase.auth.getUser();
                if (!authData?.user) {
                    router.push('/login');
                    return;
                }

                const { data: userRow } = await supabase
                    .from('users')
                    .select('id, full_name, role, avatar_url')
                    .eq('email', authData.user.email!.toLowerCase())
                    .single();

                if (!userRow) {
                    router.push('/login');
                    return;
                }

                if (!mountedRef.current) return;
                currentUserIdRef.current = userRow.id;
                setCurrentUser(userRow as UserProfile);

                const { data: orderData } = await supabase
                    .from('orders')
                    .select('*, products(name)')
                    .eq('id', orderId)
                    .single();

                if (!orderData) {
                    if (mountedRef.current) setError('Order not found');
                    return;
                }

                const { data: productData } = await supabase
                    .from('products')
                    .select('farmer_id')
                    .eq('id', orderData.product_id)
                    .eq('is_deleted', false)
                    .single();

                const isFarmer = productData?.farmer_id === userRow.id;
                const isBuyer = orderData.buyer_id === userRow.id;

                if (!isFarmer && !isBuyer) {
                    if (mountedRef.current) setError('You do not have access to this chat');
                    return;
                }

                if (!mountedRef.current) return;
                setOrder(orderData as Order);

                const otherUserId = isFarmer ? orderData.buyer_id : productData?.farmer_id;
                const { data: otherUserData } = await supabase
                    .from('users')
                    .select('id, full_name, avatar_url')
                    .eq('id', otherUserId)
                    .single();

                if (!mountedRef.current) return;
                setOtherUser(otherUserData as UserProfile);
                setOtherUserAvatarUrl(resolvePublicStorageUrl(otherUserData?.avatar_url || ''));

                await refreshMessages();

                if (!mountedRef.current) return;
                setupRealtimeChannel();
            } catch (err: any) {
                if (mountedRef.current) {
                    setError(err.message || 'Error loading chat');
                    console.error(err);
                }
            } finally {
                if (mountedRef.current) setLoading(false);
            }
        };

        if (orderId) {
            fetchData();
        }

        return () => {
            mountedRef.current = false;
            removeChatChannel();
        };
    }, [orderId, router]);

    const insertChatMessage = async (payload: { message: string; message_type: MessageType }) => {
        if (!currentUser || !otherUser) return;

        const { data: insertedRow, error: insertError } = await supabase
            .from('messages')
            .insert({
                order_id: orderId,
                sender_id: currentUser.id,
                receiver_id: otherUser.id,
                message: payload.message,
                message_type: payload.message_type,
                is_read: false,
            })
            .select('id, message, message_type, sender_id, receiver_id, created_at')
            .single();

        if (insertError) throw insertError;

        setMessages((prev) => [
            ...prev,
            {
                id: insertedRow.id,
                message: insertedRow.message,
                message_type: (insertedRow.message_type || 'text') as MessageType,
                sender_id: insertedRow.sender_id,
                receiver_id: insertedRow.receiver_id,
                sender_name: currentUser.full_name,
                created_at: insertedRow.created_at,
            },
        ]);
    };

    const handleSendTextMessage = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!messageText.trim() || !currentUser || !otherUser || isSending || isRecording) return;

        setIsSending(true);
        setError('');

        try {
            await insertChatMessage({ message: messageText.trim(), message_type: 'text' });
            setMessageText('');
        } catch (err: any) {
            setError(err.message || 'Failed to send message');
        } finally {
            setIsSending(false);
        }
    };

    const uploadChatMedia = async (file: File, messageType: 'image' | 'audio') => {
        if (!currentUser || !otherUser) return;

        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_') || `attachment.${messageType === 'audio' ? 'webm' : 'jpg'}`;
        const path = `chat-media/${orderId}/${messageType}-${Date.now()}-${safeName}`;

        setError('');
        setIsSending(true);

        try {
            const { error: uploadError } = await supabase.storage
                .from(CHAT_MEDIA_BUCKET)
                .upload(path, file, {
                    upsert: true,
                    contentType: file.type || (messageType === 'audio' ? 'audio/webm' : 'image/jpeg'),
                });

            if (uploadError) {
                throw new Error(uploadError.message || 'Upload failed');
            }

            const publicUrl = supabase.storage.from(CHAT_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
            await insertChatMessage({ message: publicUrl, message_type: messageType });
        } finally {
            setIsSending(false);
        }
    };

    const handleImagePick = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setError('Please choose an image file.');
            return;
        }

        try {
            await uploadChatMedia(file, 'image');
        } catch (err: any) {
            setError(err?.message || 'Failed to send image');
        }
    };

    const startVoiceRecording = async () => {
        if (isRecording || isSending || !currentUser || !otherUser) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);

            chunksRef.current = [];
            streamRef.current = stream;
            recorderRef.current = recorder;
            setError('');
            setIsRecording(true);

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            recorder.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
                chunksRef.current = [];
                stream.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
                recorderRef.current = null;
                setIsRecording(false);

                if (blob.size === 0) return;

                try {
                    const audioFile = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type || 'audio/webm' });
                    await uploadChatMedia(audioFile, 'audio');
                } catch (err: any) {
                    setError(err?.message || 'Failed to send voice message');
                }
            };

            recorder.start();
        } catch (err: any) {
            setIsRecording(false);
            setError(err?.message || 'Microphone access is required for voice messages.');
        }
    };

    const stopVoiceRecording = () => {
        const recorder = recorderRef.current;
        if (!recorder || recorder.state === 'inactive') return;

        setIsRecording(false);
        recorder.stop();
    };

    const startEdit = (message: Message) => {
        if (message.message_type !== 'text') return;
        setEditingMessageId(message.id);
        setEditingText(message.message);
    };

    const cancelEdit = () => {
        setEditingMessageId(null);
        setEditingText('');
    };

    const saveEdit = async () => {
        if (!editingMessageId || !editingText.trim() || !currentUser) return;

        try {
            const updateQuery = supabase
                .from('messages')
                .update({ message: editingText.trim() })
                .eq('id', editingMessageId)
                .eq('sender_id', currentUser.id)
                .eq('message_type', 'text');

            const { error: updateError } = await updateQuery;

            if (updateError) throw updateError;

            const refreshedMessages = await loadMessages();
            setMessages(refreshedMessages as Message[]);
            cancelEdit();
        } catch (err: any) {
            setError(err?.message || 'Failed to edit message');
        }
    };

    const deleteMessage = async (messageId: string) => {
        if (!currentUser) return;

        try {
            const deleteQuery = supabase
                .from('messages')
                .delete()
                .eq('id', messageId)
                .eq('sender_id', currentUser.id)
                .eq('message_type', 'text');

            const { error: deleteError } = await deleteQuery;

            if (deleteError) throw deleteError;

            const refreshedMessages = await loadMessages();
            setMessages(refreshedMessages as Message[]);
            if (editingMessageId === messageId) cancelEdit();
        } catch (err: any) {
            setError(err?.message || 'Failed to delete message');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f1a0f] flex items-center justify-center text-white">
                <p className="text-slate-300">Loading chat...</p>
            </div>
        );
    }

    if (error || !order || !currentUser || !otherUser) {
        return (
            <div className="min-h-screen bg-[#0f1a0f] flex items-center justify-center text-white">
                <div className="text-center">
                    <p className="mb-4 text-red-300">{error || 'Unable to load chat'}</p>
                    <button
                        onClick={() => router.back()}
                        className="rounded-lg bg-blue-600 px-6 py-2 font-bold text-white hover:bg-blue-700"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0f1a0f] flex flex-col text-white">
            <div className="border-b border-[#1f331f] bg-[#0a150a] shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
                <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 overflow-hidden rounded-full border border-[#2d4a2d] bg-[#1a2e1a]">
                            {otherUserAvatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={otherUserAvatarUrl} alt={otherUser.full_name} className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center rounded-full bg-[#16a34a] text-sm font-bold text-white">
                                    {getInitials(otherUser.full_name)}
                                </div>
                            )}
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white">Order Chat</h1>
                            <p className="text-sm text-slate-400">
                                {order.products?.name} - Chatting with {otherUser.full_name}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => router.back()}
                        className="rounded-lg border border-[#2d4a2d] px-3 py-2 text-slate-300 transition hover:bg-[#1a2e1a] hover:text-white"
                        aria-label="Back"
                    >
                        ✕
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-[#0f1a0f]">
                <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
                    {messages.length === 0 ? (
                        <div className="flex min-h-[50vh] items-center justify-center text-slate-500">
                            <p>No messages yet. Start the conversation!</p>
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const isOwnMessage = msg.sender_id === currentUser.id;
                            const isImageMessage = (msg.message_type || 'text') === 'image';
                            const isAudioMessage = (msg.message_type || 'text') === 'audio';

                            return (
                                <div key={msg.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                                    <div
                                        className={`max-w-[82%] rounded-2xl p-4 shadow-lg ${isOwnMessage
                                            ? 'rounded-br-md bg-[#16a34a] text-white'
                                            : 'rounded-bl-md bg-[#1e3a1e] text-white'
                                            }`}
                                    >
                                        {!isOwnMessage && (
                                            <p className="mb-2 text-xs font-semibold text-white/80">{msg.sender_name}</p>
                                        )}

                                        {editingMessageId === msg.id ? (
                                            <div className="space-y-2">
                                                <input
                                                    type="text"
                                                    value={editingText}
                                                    onChange={(event) => setEditingText(event.target.value)}
                                                    className="w-full rounded-lg border border-[#2d4a2d] bg-[#0f1a0f] px-3 py-2 text-sm text-white outline-none"
                                                />
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={saveEdit}
                                                        className="rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white hover:bg-green-700"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={cancelEdit}
                                                        className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : isImageMessage ? (
                                            <button
                                                type="button"
                                                onClick={() => setPreviewImageUrl(msg.message)}
                                                className="block w-full overflow-hidden rounded-xl border border-white/10 bg-black/10"
                                            >
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={msg.message} alt="Chat attachment" className="max-h-64 w-full object-cover" />
                                            </button>
                                        ) : isAudioMessage ? (
                                            <audio controls className="w-full">
                                                <source src={msg.message} />
                                                Your browser does not support the audio element.
                                            </audio>
                                        ) : (
                                            <p className="break-words whitespace-pre-wrap text-[15px] leading-6">{msg.message}</p>
                                        )}

                                        <div className="mt-2 flex items-center justify-between gap-3 text-xs text-white/70">
                                            <span>{new Date(msg.created_at).toLocaleTimeString()}</span>
                                            {isOwnMessage && msg.message_type === 'text' && editingMessageId !== msg.id && (
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => startEdit(msg)}
                                                        className="rounded bg-[#0a150a] px-2 py-1 text-xs font-bold text-white hover:bg-[#132313]"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteMessage(msg.id)}
                                                        className="rounded bg-[#0a150a] px-2 py-1 text-xs font-bold text-red-300 hover:bg-[#132313]"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <div className="border-t border-[#1f331f] bg-[#0a150a] px-4 py-4">
                <form onSubmit={handleSendTextMessage} className="mx-auto flex max-w-3xl items-center gap-2">
                    <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="rounded-xl bg-blue-600 px-3 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                        disabled={isSending || isRecording}
                        title="Attach image"
                    >
                        🖼️
                    </button>
                    <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImagePick}
                    />
                    <button
                        type="button"
                        onPointerDown={startVoiceRecording}
                        onPointerUp={stopVoiceRecording}
                        onPointerLeave={stopVoiceRecording}
                        onPointerCancel={stopVoiceRecording}
                        className={`rounded-xl px-3 py-3 text-sm font-bold text-white disabled:opacity-50 ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-[#1e3a1e] hover:bg-[#274227]'}`}
                        disabled={isSending && !isRecording}
                        title={isRecording ? 'Recording...' : 'Hold to record voice'}
                    >
                        🎤
                    </button>
                    <input
                        type="text"
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 rounded-xl border border-[#2d4a2d] bg-[#0f1a0f] px-4 py-3 text-white outline-none placeholder:text-slate-500"
                        disabled={isSending || isRecording}
                    />
                    <button
                        type="submit"
                        disabled={isSending || isRecording || !messageText.trim()}
                        className="rounded-xl bg-green-600 px-5 py-3 font-bold text-white hover:bg-green-700 disabled:opacity-50"
                    >
                        Send
                    </button>
                </form>
                {error && <p className="mx-auto mt-3 max-w-3xl text-sm text-red-300">{error}</p>}
                {isRecording && <p className="mx-auto mt-2 max-w-3xl text-sm text-[#4ade80]">Recording voice message...</p>}
            </div>

            {previewImageUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4" onClick={() => setPreviewImageUrl('')}>
                    <div className="relative max-h-[90vh] max-w-5xl">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={previewImageUrl} alt="Preview" className="max-h-[90vh] max-w-full rounded-2xl border border-white/10 shadow-2xl" />
                        <button
                            type="button"
                            onClick={() => setPreviewImageUrl('')}
                            className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-sm font-bold text-white"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
