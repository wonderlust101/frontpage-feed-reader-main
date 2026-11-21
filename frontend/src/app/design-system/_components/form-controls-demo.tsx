'use client';

// Working form controls for the components section: checkboxes, a switch, a select and the search field, with demo state.

import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { SearchField } from '@/components/ui/search-field';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

// Renders the controls in two columns: choices (checkbox, switch) beside fields (select, search).
export function FormControlsDemo() {
    const [hideRead, setHideRead] = useState(true);
    const [query, setQuery] = useState('container queries');

    return (
        <div className="grid max-w-3xl gap-x-10 gap-y-8 md:grid-cols-2">
            <div className="flex flex-col gap-3">
                <Checkbox id="digest-weekly" label="Weekly highlights" hint="A digest of the week's most-read items, every Monday." defaultChecked />
                <Checkbox id="digest-summaries" label="Summarize long articles" hint="Adds an AI summary above articles over 8 minutes." />
                <Switch label="Hide read items" on={hideRead} onChange={setHideRead} className="mt-2 w-full max-w-xs" />
            </div>
            <div className="flex flex-col gap-6">
                <Select id="refresh-interval" label="Check feeds" defaultValue="30">
                    <option value="15">Every 15 minutes</option>
                    <option value="30">Every 30 minutes</option>
                    <option value="60">Every hour</option>
                </Select>
                <SearchField id="search-items" label="Search items" placeholder="Search titles and sources" value={query} onChange={setQuery} />
            </div>
        </div>
    );
}
