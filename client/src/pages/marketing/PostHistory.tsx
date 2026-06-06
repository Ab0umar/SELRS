import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CalendarDays, CheckCircle2, ImageIcon, Loader2, RefreshCw, Trash2, XCircle } from "lucide-react";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  draft: { label: "مسودة", className: "bg-muted text-muted-foreground" },
  published: { label: "منشور", className: "bg-success/15 text-success" },
  failed: { label: "فشل", className: "bg-destructive/15 text-destructive" },
  scheduled: { label: "مجدول", className: "bg-info/15 text-info" },
};

const DAY_LABELS: Record<string, string> = {
  saturday: "السبت",
  tuesday: "الثلاثاء",
  thursday: "الخميس",
};

export default function PostHistory() {
  const [filter, setFilter] = useState<"published" | "failed" | "all">("published");

  const utils = trpc.useUtils();

  const listQuery = trpc.marketing.listPosts.useQuery({
    status: filter,
    limit: 100,
    offset: 0,
  });

  const deleteMutation = trpc.marketing.deletePost.useMutation({
    onSuccess: () => {
      toast.success("تم حذف المنشور");
      void utils.marketing.listPosts.invalidate();
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const posts = listQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">سجل المنشورات</h1>
        <Button size="sm" variant="ghost" onClick={() => void utils.marketing.listPosts.invalidate()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["published", "failed", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f === "published" ? "منشورة" : f === "failed" ? "فاشلة" : "الكل"}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      <div className="space-y-4">
        {listQuery.isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-xl border border-border bg-card py-10 text-center text-sm text-muted-foreground">
            لا توجد منشورات
          </div>
        ) : (
          posts.map((post) => {
            const badge = STATUS_BADGE[post.status] ?? { label: post.status, className: "" };
            return (
              <div key={post.id} className="rounded-xl border border-border bg-card overflow-hidden">
                {/* Image */}
                {post.imageUrl ? (
                  <div className="relative h-48 w-full bg-muted">
                    <img
                      src={post.imageUrl}
                      alt={post.title ?? "Post image"}
                      className="h-full w-full object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                ) : (
                  <div className="flex h-24 items-center justify-center bg-muted/20 border-b border-border">
                    <ImageIcon className="h-5 w-5 text-muted-foreground/25" />
                  </div>
                )}

                <div className="p-4 space-y-2">
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {post.status === "published"
                        ? <CheckCircle2 className="h-4 w-4 text-success" />
                        : post.status === "failed"
                          ? <XCircle className="h-4 w-4 text-destructive" />
                          : <CalendarDays className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground leading-snug">{post.title}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {post.topic && <span>{post.topic}</span>}
                        {post.postDay && <><span>·</span><span>{DAY_LABELS[post.postDay] ?? post.postDay}</span></>}
                        <span>·</span>
                        <span>
                          {post.publishedAt
                            ? new Date(post.publishedAt).toLocaleDateString("ar-EG")
                            : new Date(post.createdAt).toLocaleDateString("ar-EG")}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge className={`text-xs ${badge.className}`}>{badge.label}</Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate({ id: post.id })}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Content */}
                  {post.content && (
                    <p className="line-clamp-2 text-sm text-foreground/75 leading-relaxed">{post.content}</p>
                  )}

                  {/* Hashtags */}
                  {post.hashtags && (
                    <p className="text-xs text-primary/70">{post.hashtags}</p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
