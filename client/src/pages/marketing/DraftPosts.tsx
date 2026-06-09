import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  FileText,
  ImageIcon,
  Loader2,
  RefreshCw,
  Send,
  Trash2,
} from "lucide-react";

const DAY_LABELS: Record<string, string> = {
  saturday: "السبت — تصحيح الإبصار",
  tuesday: "الثلاثاء — المياه البيضاء",
  thursday: "الخميس — صحة عامة",
};

export default function DraftPosts() {
  const [publishId, setPublishId] = useState<number | null>(null);
  const [imageGenId, setImageGenId] = useState<number | null>(null);
  const [limit, setLimit] = useState(25);

  const utils = trpc.useUtils();

  const listQuery = trpc.marketing.listPosts.useQuery({
    status: "draft",
    limit,
    offset: 0,
  });

  const publishMutation = trpc.marketing.publishPost.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث حالة المنشور إلى منشور");
      setPublishId(null);
      void utils.marketing.listPosts.invalidate();
      void utils.marketing.dashboardSummary.invalidate();
    },
    onError: (err: { message: string }) => {
      toast.error(err.message);
      setPublishId(null);
    },
  });

  const generateImageMutation = trpc.marketing.generateImageForPost.useMutation(
    {
      onSuccess: () => {
        toast.success("تم توليد الصورة بنجاح");
        setImageGenId(null);
        void utils.marketing.listPosts.invalidate();
      },
      onError: (err: { message: string }) => {
        toast.error(err.message);
        setImageGenId(null);
      },
    },
  );

  const deleteMutation = trpc.marketing.deletePost.useMutation({
    onSuccess: () => {
      toast.success("تم حذف المسودة");
      void utils.marketing.listPosts.invalidate();
      void utils.marketing.dashboardSummary.invalidate();
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const posts = listQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">المسودات</h1>
          <p className="text-sm text-muted-foreground">
            {posts.length} مسودة في الانتظار
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          aria-label="تحديث القائمة"
          onClick={() => void utils.marketing.listPosts.invalidate()}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div
        className="space-y-4"
        aria-live="polite"
        aria-busy={listQuery.isLoading}
      >
        {listQuery.isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-xl border border-border bg-card py-10 text-center">
            <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">لا توجد مسودات</p>
            <p className="mt-1 text-xs text-muted-foreground">
              استخدم زر "توليد منشور" من لوحة التحكم
            </p>
          </div>
        ) : (
          <>
            {posts.map((post) => (
              <div
                key={post.id}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                {/* Image area */}
                {post.imageUrl ? (
                  <div className="relative h-52 w-full bg-muted">
                    <img
                      src={post.imageUrl}
                      alt={post.title ?? "صورة منشور تسويقي"}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display =
                          "none";
                      }}
                    />
                  </div>
                ) : post.imagePrompt ? (
                  <div className="flex h-28 items-center justify-center bg-muted/30 border-b border-border">
                    <div className="text-center">
                      <ImageIcon className="mx-auto mb-1 h-5 w-5 text-muted-foreground/30" />
                      <p className="text-xs text-muted-foreground">
                        لا توجد صورة — اضغط "توليد صورة"
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="p-4 space-y-2">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground leading-snug">
                        {post.title}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {post.topic && <span>{post.topic}</span>}
                        {post.postDay && (
                          <>
                            <span>·</span>
                            <span>
                              {DAY_LABELS[post.postDay] ?? post.postDay}
                            </span>
                          </>
                        )}
                        <span>·</span>
                        <span>
                          {new Date(post.createdAt).toLocaleDateString("ar-EG")}
                        </span>
                      </div>
                    </div>
                    <Badge className="shrink-0 bg-muted text-muted-foreground text-xs">
                      مسودة
                    </Badge>
                  </div>

                  {/* Content */}
                  {post.content && (
                    <p className="line-clamp-3 text-sm text-foreground/80 leading-relaxed">
                      {post.content}
                    </p>
                  )}

                  {/* Hashtags */}
                  {post.hashtags && (
                    <p className="text-xs text-primary/70">{post.hashtags}</p>
                  )}

                  {/* CTA */}
                  {post.cta && (
                    <p className="text-xs font-medium text-foreground/80">
                      {post.cta}
                    </p>
                  )}

                  {/* Image prompt hint when no image yet */}
                  {post.imagePrompt && !post.imageUrl && (
                    <div className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-2">
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        <span className="font-medium">وصف الصورة: </span>
                        {post.imagePrompt}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {post.imagePrompt && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs"
                        onClick={() => {
                          setImageGenId(post.id);
                          generateImageMutation.mutate({ postId: post.id });
                        }}
                        disabled={
                          generateImageMutation.isPending &&
                          imageGenId === post.id
                        }
                      >
                        {generateImageMutation.isPending &&
                        imageGenId === post.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <ImageIcon className="h-3 w-3" />
                        )}
                        {post.imageUrl ? "إعادة توليد الصورة" : "توليد صورة"}
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="default"
                      className="gap-1.5 text-xs"
                      onClick={() => {
                        setPublishId(post.id);
                        publishMutation.mutate({ id: post.id });
                      }}
                      disabled={
                        publishMutation.isPending && publishId === post.id
                      }
                    >
                      {publishMutation.isPending && publishId === post.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Send className="h-3 w-3" />
                      )}
                      نشر الآن
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="حذف المسودة"
                      className="h-9 w-9 p-0 text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate({ id: post.id })}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {posts.length === limit && (
              <div className="flex justify-center pt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setLimit((l) => l + 25)}
                >
                  عرض المزيد
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
