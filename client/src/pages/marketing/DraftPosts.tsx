import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BookImage,
  FileText,
  ImageIcon,
  Loader2,
  RefreshCw,
  Send,
  Trash2,
  ZoomIn,
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
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [pickerPostId, setPickerPostId] = useState<number | null>(null);

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

  const updatePostMutation = trpc.marketing.updatePost.useMutation({
    onSuccess: () => {
      toast.success("تم تعيين صورة القالب");
      setPickerPostId(null);
      void utils.marketing.listPosts.invalidate();
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const designsQuery = trpc.marketing.listReferenceDesigns.useQuery(
    undefined,
    { enabled: pickerPostId !== null },
  );

  const posts = listQuery.data ?? [];
  const designs = designsQuery.data ?? [];

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
            {posts.map((post: any) => (
              <div
                key={post.id}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                {/* Image area */}
                {post.imageUrl ? (
                  <div
                    className="relative h-52 w-full bg-muted cursor-zoom-in group"
                    onClick={() => setLightboxUrl(post.imageUrl)}
                  >
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
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                      <ZoomIn className="h-7 w-7 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                    </div>
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
                    {/* Pick from brand library — always visible */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/5"
                      onClick={() => setPickerPostId(post.id)}
                    >
                      <BookImage className="h-3 w-3" />
                      اختر من المكتبة
                    </Button>

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
                        {post.imageUrl ? "توليد AI" : "توليد AI"}
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

      {/* Brand library picker */}
      <Dialog open={pickerPostId !== null} onOpenChange={(open) => { if (!open) setPickerPostId(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>اختر صورة من مكتبة التصميمات</DialogTitle>
          </DialogHeader>
          {designsQuery.isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : designs.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              لا توجد تصميمات في المكتبة — ارفع تصاميمك في صفحة مكتبة العلامة التجارية
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {designs.map((d: any) => (
                <button
                  key={d.id}
                  type="button"
                  className="group relative overflow-hidden rounded-lg border-2 border-transparent hover:border-primary transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => {
                    if (pickerPostId !== null) {
                      updatePostMutation.mutate({ id: pickerPostId, imageUrl: d.fileUrl });
                    }
                  }}
                  disabled={updatePostMutation.isPending}
                >
                  <img
                    src={d.fileUrl}
                    alt={d.originalName}
                    className="aspect-square w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors flex items-end">
                    <p className="w-full truncate bg-black/50 px-2 py-1 text-[11px] text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      {d.originalName}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Full-image lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={(open) => { if (!open) setLightboxUrl(null); }}>
        <DialogContent className="max-w-3xl p-2 bg-black border-0">
          {lightboxUrl && (
            <img
              src={lightboxUrl}
              alt="صورة المنشور"
              className="w-full h-auto max-h-[85vh] object-contain rounded"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
