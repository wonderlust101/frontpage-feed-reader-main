import { FeedItemRow } from '@/features/items/components/feed-item-row';
import { getCategory, type SampleItem } from '../_data/sample-data';

type SampleItemRowProps = {
    item: SampleItem;
    href: string;
    isSelected?: boolean;
};

export function SampleItemRow({ item, href, isSelected }: SampleItemRowProps) {
    return (
        <FeedItemRow
            title={item.title}
            href={href}
            source={item.source}
            time={item.time}
            isNew={item.isNew}
            health={item.health}
            category={getCategory(item.category)}
            isSelected={isSelected}
        />
    );
}
