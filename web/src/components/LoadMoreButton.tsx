import { Button } from "@/components/ui/button";
import { t } from "@/i18n";

type Props = {
    hasNextPage?: boolean;
    isFetchingNextPage: boolean;
    isFetchNextPageError?: boolean;
    onLoadMore(): void;
};

export function LoadMoreButton({
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    onLoadMore,
}: Props) {
    if (!hasNextPage && !isFetchNextPageError) return null;
    return (
        <div className="space-y-2 pt-2 text-center">
            {isFetchNextPageError && (
                <p className="text-sm text-destructive" role="alert">
                    {t("pagination.error")}
                </p>
            )}
            <Button
                type="button"
                variant="outline"
                disabled={isFetchingNextPage}
                aria-busy={isFetchingNextPage}
                onClick={onLoadMore}
            >
                {isFetchingNextPage
                    ? t("pagination.loading")
                    : isFetchNextPageError
                      ? t("common.retry")
                      : t("pagination.loadMore")}
            </Button>
        </div>
    );
}
