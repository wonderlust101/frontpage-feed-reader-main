'use client';

import { useState } from 'react';
import { CategoryFilter } from '@/features/categories/components/category-filter';
import { CATEGORIES } from '../_data/sample-data';

export function CategoryFilterDemo() {
    const [selected, setSelected] = useState<string[]>(['frontend', 'ai']);

    function toggle(id: string) {
        setSelected((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
    }

    return <CategoryFilter categories={CATEGORIES} selected={selected} onToggle={toggle} />;
}
