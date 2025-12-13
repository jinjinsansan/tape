import Link from "next/link";
import { 
  Users, 
  Coins, 
  Share2, 
  AlertTriangle, 
  FileText, 
  Globe,
  ArrowRight,
  TrendingUp,
  Calendar,
  Shield
} from "lucide-react";

import { getSupabaseAdminClient } from "@/server/supabase";

async function getAdminStats() {
  const supabase = getSupabaseAdminClient();

  try {
    const [
      { count: totalUsers },
      { count: publicDiaries },
      { count: pendingReports },
      { count: totalBookings },
      { count: xShares },
      { count: usersWithTwitter }
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase
        .from("emotion_diary_entries")
        .select("*", { count: "exact", head: true })
        .eq("visibility", "public"),
      supabase
        .from("feed_reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase.from("bookings").select("*", { count: "exact", head: true }),
      supabase
        .from("feed_share_log")
        .select("*", { count: "exact", head: true })
        .eq("platform", "x"),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .not("twitter_username", "is", null)
    ]);

    return {
      totalUsers: totalUsers ?? 0,
      publicDiaries: publicDiaries ?? 0,
      pendingReports: pendingReports ?? 0,
      totalBookings: totalBookings ?? 0,
      xShares: xShares ?? 0,
      usersWithTwitter: usersWithTwitter ?? 0
    };
  } catch (error) {
    console.error("Failed to load admin stats", error);
    return {
      totalUsers: 0,
      publicDiaries: 0,
      pendingReports: 0,
      totalBookings: 0,
      xShares: 0,
      usersWithTwitter: 0
    };
  }
}

export default async function AdminDashboard() {
  const stats = await getAdminStats();

  const sections = [
    {
      href: "/admin/users",
      title: "ユーザー管理",
      description: "ユーザーの検索・ロール変更・ウォレット調整",
      icon: Users,
      color: "from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20",
      iconColor: "text-blue-600",
      stats: `${stats.totalUsers}人`
    },
    {
      href: "/admin/points",
      title: "ポイント管理",
      description: "獲得ルール設定・景品カタログ・交換履歴",
      icon: Coins,
      color: "from-emerald-500/10 to-emerald-600/10 hover:from-emerald-500/20 hover:to-emerald-600/20",
      iconColor: "text-emerald-600",
      stats: "ルール・景品"
    },
    {
      href: "/admin/share-monitoring",
      title: "Xシェア監視",
      description: "シェア統計・ログ確認・不正防止",
      icon: Share2,
      color: "from-sky-500/10 to-sky-600/10 hover:from-sky-500/20 hover:to-sky-600/20",
      iconColor: "text-sky-600",
      stats: `${stats.xShares}件 / ${stats.usersWithTwitter}人`
    },
    {
      href: "/admin/reports",
      title: "通報管理",
      description: "みんなの日記の通報キュー確認・対応",
      icon: AlertTriangle,
      color: "from-rose-500/10 to-rose-600/10 hover:from-rose-500/20 hover:to-rose-600/20",
      iconColor: "text-rose-600",
      stats: `${stats.pendingReports}件`
    },
    {
      href: "/admin/diary",
      title: "日記管理",
      description: "全ユーザーの日記・カウンセラーコメント",
      icon: FileText,
      color: "from-purple-500/10 to-purple-600/10 hover:from-purple-500/20 hover:to-purple-600/20",
      iconColor: "text-purple-600",
      stats: "日記・コメント"
    },
    {
      href: "/admin/feed",
      title: "みんなの日記",
      description: "公開日記・コメント削除・モデレーション",
      icon: Globe,
      color: "from-amber-500/10 to-amber-600/10 hover:from-amber-500/20 hover:to-amber-600/20",
      iconColor: "text-amber-600",
      stats: `${stats.publicDiaries}件`
    },
    {
      href: "/admin/michelle-monitoring",
      title: "ミシェル心理学監視",
      description: "マスター管理者専用・危機対応・緊急度管理",
      icon: Shield,
      color: "from-pink-500/10 to-pink-600/10 hover:from-pink-500/20 hover:to-pink-600/20",
      iconColor: "text-pink-600",
      stats: "危機監視"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-12">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <header className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.3em] text-rose-500">DASHBOARD</p>
          <h1 className="text-4xl font-black text-slate-900">管理者ダッシュボード</h1>
          <p className="text-sm text-slate-500">
            Tape 心理学プラットフォームの管理・運営を一元管理
          </p>
        </header>

        {/* Quick Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">総ユーザー数</p>
                <p className="mt-1 text-3xl font-black text-slate-900">{stats.totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-slate-400" />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">公開日記</p>
                <p className="mt-1 text-3xl font-black text-slate-900">{stats.publicDiaries}</p>
              </div>
              <FileText className="h-8 w-8 text-slate-400" />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Xシェア</p>
                <p className="mt-1 text-3xl font-black text-slate-900">{stats.xShares}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-slate-400" />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">予約数</p>
                <p className="mt-1 text-3xl font-black text-slate-900">{stats.totalBookings}</p>
              </div>
              <Calendar className="h-8 w-8 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Alerts */}
        {stats.pendingReports > 0 && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-rose-600" />
              <div>
                <p className="text-sm font-semibold text-rose-900">
                  未処理の通報が{stats.pendingReports}件あります
                </p>
                <p className="text-xs text-rose-700">確認してください</p>
              </div>
            </div>
          </div>
        )}

        {/* Section Cards */}
        <div>
          <h2 className="mb-4 text-xl font-bold text-slate-900">管理セクション</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sections.map((section) => {
              const Icon = section.icon;
              
              if (section.disabled) {
                return (
                  <div
                    key={section.href}
                    className="group relative cursor-not-allowed overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 opacity-60 shadow-sm"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${section.color} opacity-50`} />
                    <div className="relative space-y-3">
                      <div className="flex items-start justify-between">
                        <Icon className={`h-8 w-8 ${section.iconColor}`} />
                        {section.badge && (
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
                            {section.badge}
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{section.title}</h3>
                        <p className="mt-1 text-xs text-slate-600">{section.description}</p>
                      </div>
                      <p className="text-sm font-semibold text-slate-500">{section.stats}</p>
                    </div>
                  </div>
                );
              }

              return (
                <Link
                  key={section.href}
                  href={section.href}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-lg"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${section.color} opacity-0 transition-opacity group-hover:opacity-100`} />
                  <div className="relative space-y-3">
                    <div className="flex items-start justify-between">
                      <Icon className={`h-8 w-8 ${section.iconColor} transition-transform group-hover:scale-110`} />
                      <ArrowRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{section.title}</h3>
                      <p className="mt-1 text-xs text-slate-600">{section.description}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-500">{section.stats}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-sm font-semibold text-slate-900">
            🚀 管理システム
          </p>
          <p className="mt-2 text-xs text-slate-500">
            ユーザー管理・ポイント管理・Xシェア監視・通報管理・カウンセラー管理
          </p>
          <p className="text-xs text-slate-500">
            ミシェル心理学監視・お知らせ配信・システム設定
          </p>
          <div className="mt-4 rounded-xl bg-gradient-to-r from-rose-50 to-purple-50 p-3">
            <p className="text-xs font-semibold text-slate-700">
              💡 ヒント
            </p>
            <p className="mt-1 text-xs text-slate-500">
              各セクションから対応する機能にアクセスできます
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
