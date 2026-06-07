import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "用户管理后台",
  description: "用户基础服务管理系统",
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
