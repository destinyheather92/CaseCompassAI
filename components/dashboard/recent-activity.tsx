import Link from "next/link";
import type { UserActivityItem } from "@/lib/dashboard/get-user-activity";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function RecentActivity({ activity }: { activity: UserActivityItem[] }) {
  if (activity.length === 0) return null;

  return (
    <div className="glass-card rounded-2xl p-6">
      <h2 className="text-sm font-semibold tracking-wide text-cc-muted uppercase">Recent Activity</h2>
      <ul className="mt-4 flex flex-col gap-3">
        {activity.map((item) => {
          const content = (
            <>
              <p className="text-sm font-medium text-cc-text">{item.title}</p>
              <p className="text-xs text-cc-muted">{formatDate(item.createdAt)}</p>
            </>
          );
          return (
            <li key={item.id}>
              {item.href ? (
                <Link href={item.href} className="block rounded-lg p-2 -m-2 transition-colors hover:bg-white/[0.04]">
                  {content}
                </Link>
              ) : (
                <div className="p-2 -m-2">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
