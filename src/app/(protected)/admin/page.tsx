"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient, adminClient } from "@/lib/auth-client";
import type { Skill } from "../../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PlusIcon,
  Trash2Icon,
  ShieldBanIcon,
  ShieldCheckIcon,
  Loader2Icon,
  ArrowLeftIcon,
  LogOutIcon,
  UserIcon,
  ShieldIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  banned: boolean;
  banReason: string | null;
  banExpires: string | null;
  emailVerified: boolean;
  createdAt: string;
}

interface SkillPermissionGrant {
  id: string;
  skillName: string;
  userId: string;
  grantedBy: string | null;
  createdAt: string;
}

export default function AdminPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [permissionGrants, setPermissionGrants] = useState<SkillPermissionGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [permissionsSaving, setPermissionsSaving] = useState(false);

  // Search
  const [search, setSearch] = useState("");
  const [skillSearch, setSkillSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [selectedSkillNames, setSelectedSkillNames] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Create user dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [creating, setCreating] = useState(false);

  // Delete confirmation dialog
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const userRole = (session?.user as Record<string, unknown> | undefined)
    ?.role as string | undefined;

  const fetchUsers = useCallback(async () => {
    try {
      const res = await adminClient.admin.listUsers({ query: {} });
      setUsers((res.data?.users as AdminUser[]) || []);
    } catch {
      toast.error("加载用户列表失败");
    }
  }, []);

  const fetchSkills = useCallback(async () => {
    const resp = await fetch("/api/skills");
    const data = (await resp.json()) as { skills?: Skill[]; error?: string };
    if (!resp.ok) throw new Error(data.error || "加载技能列表失败");
    setSkills(data.skills || []);
  }, []);

  const fetchPermissions = useCallback(async () => {
    try {
      setPermissionsLoading(true);
      const resp = await fetch("/api/skills/permissions");
      const data = (await resp.json()) as {
        grants?: SkillPermissionGrant[];
        error?: string;
      };
      if (!resp.ok) throw new Error(data.error || "加载权限列表失败");
      setPermissionGrants(data.grants || []);
    } catch {
      toast.error("加载技能权限失败");
    } finally {
      setPermissionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isPending) return;

    if (!session) {
      router.replace("/login?redirect=/admin");
      return;
    }

    if (userRole !== "admin") {
      router.replace("/");
      return;
    }

    const timeout = window.setTimeout(() => {
      void Promise.allSettled([fetchUsers(), fetchSkills(), fetchPermissions()]).finally(
        () => setLoading(false)
      );
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [session, isPending, router, fetchUsers, fetchSkills, fetchPermissions, userRole]);

  // --- Derived data ---

  const filteredUsers = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const adminCount = users.filter((u) => u.role === "admin").length;
  const bannedCount = users.filter((u) => u.banned).length;
  const userLookup = useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users]
  );
  const permissionMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const grant of permissionGrants) {
      const set = map.get(grant.skillName) || new Set<string>();
      set.add(grant.userId);
      map.set(grant.skillName, set);
    }
    return map;
  }, [permissionGrants]);
  const docsRepoName = process.env.NEXT_PUBLIC_GITEA_DOCS_REPO;

  const filteredSkills = skills.filter((skill) => {
    // 文档仓库不参与权限分配
    if (docsRepoName && skill.name === docsRepoName) return false;
    if (!skillSearch.trim()) return true;
    const q = skillSearch.toLowerCase();
    return (
      skill.name.toLowerCase().includes(q) ||
      (skill.meta?.name || "").toLowerCase().includes(q) ||
      (skill.meta?.description || skill.description || "").toLowerCase().includes(q)
    );
  });
  const filteredPermissionUsers = users.filter((user) => {
    // 管理员默认拥有所有权限，无需参与分配
    if (user.role === "admin") return false;
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return (
      user.name.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q) ||
      user.role.toLowerCase().includes(q)
    );
  });
  const selectedSkillCount = selectedSkillNames.length;
  const selectedUserCount = selectedUserIds.length;

  const toggleSelection = (
    current: string[],
    value: string,
    setValue: (next: string[]) => void
  ) => {
    setValue(
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  };

  const clearPermissionSelection = () => {
    setSelectedSkillNames([]);
    setSelectedUserIds([]);
  };

  const handlePermissionMutation = async (mode: "grant" | "revoke") => {
    if (!selectedSkillNames.length || !selectedUserIds.length) {
      toast.error("请至少选择一个技能和一个用户");
      return;
    }

    try {
      setPermissionsSaving(true);
      const resp = await fetch("/api/skills/permissions", {
        method: mode === "grant" ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skillNames: selectedSkillNames,
          userIds: selectedUserIds,
        }),
      });
      const data = (await resp.json()) as {
        grants?: SkillPermissionGrant[];
        error?: string;
      };

      if (!resp.ok) throw new Error(data.error || "更新权限失败");

      setPermissionGrants(data.grants || []);
      toast.success(
        mode === "grant" ? "已授权技能访问" : "已撤销技能访问"
      );
      clearPermissionSelection();
    } catch {
      toast.error("更新技能权限失败");
    } finally {
      setPermissionsSaving(false);
    }
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">加载中...</span>
      </div>
    );
  }


  if (!session) return null;

  // --- Actions ---

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await adminClient.admin.createUser({
        email: newEmail,
        password: newPassword,
        name: newName,
        role: newRole,
      });
      if (res.error) {
        toast.error("创建用户失败");
      } else {
        toast.success("用户创建成功");
        setCreateOpen(false);
        setNewEmail("");
        setNewPassword("");
        setNewName("");
        setNewRole("user");
        fetchUsers();
      }
    } catch {
      toast.error("创建用户失败");
    } finally {
      setCreating(false);
    }
  };

  const handleBan = async (userId: string, banned: boolean) => {
    try {
      if (banned) {
        await adminClient.admin.unbanUser({ userId });
        toast.success("用户已解封");
      } else {
        await adminClient.admin.banUser({ userId });
        toast.success("用户已封禁");
      }
      fetchUsers();
    } catch {
      toast.error("更新封禁状态失败");
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setDeleting(true);
    try {
      await adminClient.admin.removeUser({ userId: deleteUser.id });
      toast.success(`用户「${deleteUser.name}」已删除`);
      setDeleteUser(null);
      fetchUsers();
    } catch {
      toast.error("删除用户失败");
    } finally {
      setDeleting(false);
    }
  };

  const handleRole = async (userId: string, role: string) => {
    try {
      await adminClient.admin.setRole({ userId, role });
      toast.success("角色已更新");
      fetchUsers();
    } catch {
      toast.error("更新角色失败");
    }
  };


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeftIcon className="size-4" />
              返回首页
            </Link>
            <span className="h-4 w-px bg-border" />
            <div>
              <h1 className="text-sm font-semibold">管理面板</h1>
              <p className="text-xs text-muted-foreground">用户管理</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => authClient.signOut()}
          >
            <LogOutIcon className="size-4" />
            退出登录
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <UserIcon className="size-4 text-muted-foreground" />
                用户总数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">
                {users.length}
              </p>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <ShieldIcon className="size-4 text-muted-foreground" />
                管理员
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">
                {adminCount}
              </p>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <ShieldBanIcon className="size-4 text-destructive" />
                已封禁
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums text-destructive">
                {bannedCount}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="按姓名、邮箱或角色搜索用户..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <XIcon className="size-4" />
              </button>
            )}
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <Button onClick={() => setCreateOpen(true)} size="sm">
              <PlusIcon className="size-4" />
              新建用户
            </Button>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>创建新用户</DialogTitle>
                <DialogDescription>
                  向系统添加新用户，可使用以下凭据登录。
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">姓名</Label>
                  <Input
                    id="name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                    placeholder="全名"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">邮箱</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                    placeholder="user@example.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">密码</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="至少 8 个字符"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>角色</Label>
                  <Select
                    value={newRole}
                    onValueChange={(v) => v && setNewRole(v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">用户</SelectItem>
                      <SelectItem value="admin">管理员</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateOpen(false)}
                  >
                    取消
                  </Button>
                  <Button type="submit" disabled={creating}>
                    {creating ? (
                      <>
                        <Loader2Icon className="size-4 animate-spin" />
                        创建中...
                      </>
                    ) : (
                      "创建用户"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Skill Permissions */}
        <Card>
          <CardHeader className="space-y-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldIcon className="size-4 text-muted-foreground" />
                技能访问权限
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                选择仓库和用户，然后批量授权或撤销技能访问。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <ShieldCheckIcon className="size-3.5 text-green-600" />
                管理员默认拥有全部技能访问权限，无需额外分配
              </span>
              {docsRepoName && (
                <>
                  <span className="hidden sm:inline text-border">|</span>
                  <span>
                    文档仓库 <Badge variant="secondary" className="text-[11px] px-1 py-0">{docsRepoName}</Badge> 对所有用户公开，无需授权
                  </span>
                </>
              )}
            </div>
            {(selectedSkillCount > 0 || selectedUserCount > 0) && (
              <div className="flex items-center gap-3 text-xs">
                <Badge variant="secondary" className="gap-1">
                  {selectedSkillCount} 个仓库已选
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  {selectedUserCount} 个用户已选
                </Badge>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Label className="shrink-0">仓库</Label>
                  <div className="relative w-full max-w-56">
                    <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={skillSearch}
                      onChange={(e) => setSkillSearch(e.target.value)}
                      placeholder="搜索..."
                      className="pl-8 h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="max-h-72 overflow-auto rounded-lg border">
                  {filteredSkills.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      未找到技能。
                    </div>
                  ) : (
                    filteredSkills.map((skill) => {
                      const selected = selectedSkillNames.includes(skill.name);
                      const assignedCount = permissionMap.get(skill.name)?.size || 0;
                      return (
                        <label
                          key={skill.name}
                          className={`flex cursor-pointer items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0 transition-colors hover:bg-muted/30 ${
                            selected ? "bg-muted/50" : "bg-background"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">
                              {skill.meta?.name || skill.name}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {skill.meta?.description || skill.description || "无描述"}
                            </div>
                            {assignedCount > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {Array.from(permissionMap.get(skill.name) || [])
                                  .slice(0, 3)
                                  .map((userId) => {
                                    const assignedUser = userLookup.get(userId);
                                    return (
                                      <span
                                        key={userId}
                                        className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
                                      >
                                        {assignedUser?.name || assignedUser?.email || userId}
                                      </span>
                                    );
                                  })}
                                {assignedCount > 3 && (
                                  <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                                    +{assignedCount - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {assignedCount}
                            </span>
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() =>
                                toggleSelection(
                                  selectedSkillNames,
                                  skill.name,
                                  setSelectedSkillNames
                                )
                              }
                              className="size-4 rounded border-input"
                            />
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Label className="shrink-0">用户</Label>
                  <div className="relative w-full max-w-56">
                    <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="搜索..."
                      className="pl-8 h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="max-h-72 overflow-auto rounded-lg border">
                  {filteredPermissionUsers.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      {userSearch.trim() ? "没有匹配的用户。" : "暂无可分配的用户（管理员已自动拥有全部权限）。"}
                    </div>
                  ) : (
                    filteredPermissionUsers.map((user) => {
                      const selected = selectedUserIds.includes(user.id);
                      return (
                        <label
                          key={user.id}
                          className={`flex cursor-pointer items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0 transition-colors hover:bg-muted/30 ${
                            selected ? "bg-muted/50" : "bg-background"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">
                              {user.name}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {user.email}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <Badge variant="outline" className="text-[11px]">{user.role === "admin" ? "管理员" : "用户"}</Badge>
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() =>
                                toggleSelection(
                                  selectedUserIds,
                                  user.id,
                                  setSelectedUserIds
                                )
                              }
                              className="size-4 rounded border-input"
                            />
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t pt-4">
              <Button
                onClick={() => void handlePermissionMutation("grant")}
                disabled={permissionsSaving || !selectedSkillCount || !selectedUserCount}
                size="sm"
              >
                {permissionsSaving ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  "授权访问"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => void handlePermissionMutation("revoke")}
                disabled={permissionsSaving || !selectedSkillCount || !selectedUserCount}
                size="sm"
              >
                撤销访问
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearPermissionSelection}
                disabled={!selectedSkillCount && !selectedUserCount}
              >
                清除选择
              </Button>
              {permissionsLoading && (
                <span className="text-xs text-muted-foreground">加载权限中...</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>已验证</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-8 text-center text-muted-foreground"
                    >
                      {search.trim()
                        ? "没有匹配的用户。"
                        : "暂无用户。"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.id === session.user?.id ? (
                          <Badge variant="secondary">{user.role}</Badge>
                        ) : (
                          <Select
                            value={user.role}
                            onValueChange={(v) => v && handleRole(user.id, v)}
                          >
                            <SelectTrigger size="sm" className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">用户</SelectItem>
                              <SelectItem value="admin">管理员</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.banned ? "destructive" : "outline"}
                        >
                          {user.banned ? "已封禁" : "正常"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.emailVerified ? (
                          <Badge variant="outline">已验证</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            待验证
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString("zh-CN")}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.id === session.user?.id ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant={user.banned ? "outline" : "secondary"}
                              size="xs"
                              onClick={() => handleBan(user.id, user.banned)}
                            >
                              {user.banned ? (
                                <>
                                  <ShieldCheckIcon className="size-3" />
                                  解封
                                </>
                              ) : (
                                <>
                                  <ShieldBanIcon className="size-3" />
                                  封禁
                                </>
                              )}
                            </Button>
                            <Button
                              variant="destructive"
                              size="xs"
                              onClick={() => setDeleteUser(user)}
                            >
                              <Trash2Icon className="size-3" />
                              删除
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteUser}
        onOpenChange={(open) => {
          if (!open) setDeleteUser(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除用户</DialogTitle>
            <DialogDescription>
              确定要删除{" "}
              <span className="font-medium text-foreground">
                {deleteUser?.name}
              </span>
              ？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteUser(null)}
              disabled={deleting}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  删除中...
                </>
              ) : (
                "删除"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
