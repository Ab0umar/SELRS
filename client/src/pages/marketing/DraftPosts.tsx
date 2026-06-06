import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileText, Loader2, RefreshCw, Send, Trash2 } from "lucide-react";

const DAY_LABELS: Record<string, string> = {
  saturday: "السبت — تصحيح الإبصار",
  tuesday: "الثلاثاء — المياه البيضاء",
  thursday: "الخميس — صحة عامة",
};

export default function DraftPosts() {
  const [publishId, setPublishId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const listQuery = trpc.marketing.listPosts.useQuery({
    status: "draft",
    limit: 100,
    offset: 0,
  });

  const publishMutation = trpc.marketing.publishPost.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث حالة المنشور إلى منشور");
      setPublishId(null);
      void utils.marketing.listPosts.invalidate();
      void utils.marketing.dashboardSummary.invalidate();
    },
    onError: (err) => { toast.error(err.message); setPublishId(null); },
  });

  const deleteMutation = trpc.marketing.deletePost.useMutation({
    onSuccess: () => {
      toast.success("تم حذف المسودة");
      void utils.marketing.listPosts.invalidate();
      void utils.marketing.dashboardSummary.invalidate();
    },
    onError: (err) => toast.error(err.message),
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
          onClick={() => void utils.marketing.listPosts.invalidate()}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card">
        {listQuery.isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : posts.length === 0 ? (
          <div className="py-10 text-center">
            <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">لا توجد مسودات</p>
            <p className="mt-1 text-xs text-muted-foreground">استخدم زر "توليد منشور" من لوحة التحكم</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {posts.map((post) => (
              <div key={post.id} className="flex items-start gap-3 px-4 py-3">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-foreground">{post.title}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {post.topic && <span>{post.topic}</span>}
                    {post.postDay && (
                      <>
                        <span>·</span>
                        <span>{DAY_LABELS[post.postDay] ?? post.postDay}</span>
                      </>
                    )}
                    <span>·</span>
                    <span>{new Date(post.createdAt).toLocaleDateString("ar-EG")}</span>
                  </div>
                  {post.content && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{post.content}</p>
                  )}
                  {post.hashtags && (
                    <p className="mt-1 text-xs text-primary/70">{post.hashtags}</p>
                  )}
                  {post.cta && (
                    <p className="mt-0.5 text-xs font-medium text-foreground/80">{post.cta}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <Badge className="bg-muted text-muted-foreground text-xs">مسودة</Badge>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 gap-1 px-2 text-xs"
                      onClick={() => {
                        setPublishId(post.id);
                        publishMutation.mutate({ id: post.id });
                      }}
                      disabled={publishMutation.isPending && publishId === post.id}
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
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate({ id: post.id })}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
