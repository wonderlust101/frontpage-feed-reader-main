'use client';

// Working category filter for the components section, with demo state: Frontend and AI & ML start switched on.

import { useState } from 'react';
import { CategoryFilter } from '@/features/categories/components/category-filter';
import { CATEGORIES } from '../_data/sample-data';

const FILTER_CATEGORIES = CATEGORIES.map((category) => ({ id: category.id, name: category.name, color: category.field.color }));

// Renders the filter and keeps the selected category ids in local state.
export function CategoryFilterDemo() {
    const [selected, setSelected] = useState<string[]>(['frontend', 'ai']);

    // Switches one category on or off.
    function toggle(id: string) {
        setSelected((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
    }

    return <CategoryFilter categories={FILTER_CATEGORIES} selected={selected} onToggle={toggle} />;
}
