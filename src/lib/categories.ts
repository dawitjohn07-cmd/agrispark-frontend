export type Category = {
    value: string;
    label: string;
    icon?: string;
};

export const categories: Category[] = [
    { value: 'All', label: 'All' },
    { value: 'Cereals', label: 'Cereals', icon: '🌾' },
    { value: 'Vegetables', label: 'Vegetables', icon: '🥬' },
    { value: 'Fruits', label: 'Fruits', icon: '🍊' },
    { value: 'Legumes', label: 'Legumes', icon: '🫘' },
    { value: 'Dairy', label: 'Dairy', icon: '🥛' },
    { value: 'Livestock', label: 'Livestock', icon: '🐄' },
    { value: 'Animals', label: 'Animals', icon: '🐄' },
    { value: 'Animal Products', label: 'Animal Products', icon: '🥛' },
];

export const categoryValues = categories.map((c) => c.value);
