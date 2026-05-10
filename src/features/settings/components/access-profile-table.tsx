"use client";

import { useUsers, useUpdateUserRole } from "../hooks/use-users";
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
import { getPanelRoleLabel, PANEL_ROLES } from "@/lib/auth/authorization";
import { useToast } from "@/components/ui/toast";

export function AccessProfileTable() {
  const { data: response, isLoading, error } = useUsers();
  const { toast } = useToast();
  const updateRoleMutation = useUpdateUserRole();

  if (isLoading) return <div className="p-4">Carregando utilizadores...</div>;
  if (error) return <div className="p-4 text-destructive">Erro ao carregar utilizadores.</div>;

  const users = response?.data ?? [];

  const handleRoleChange = (userId: number, role: string | null) => {
    if (!role) {
      return;
    }

    updateRoleMutation.mutate(
      { userId, role },
      {
        onSuccess: () => {
          toast("Perfil atualizado com sucesso!", "success");
        },
        onError: () => {
          toast("Erro ao atualizar perfil. Tente novamente.", "error");
        },
      }
    );
  };

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Perfil Atual</TableHead>
            <TableHead className="text-right">Alterar Perfil</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                Nenhum utilizador encontrado.
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{getPanelRoleLabel(user.role)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end">
                    <Select
                      value={user.role}
                      onValueChange={(value) => handleRoleChange(user.id, value)}
                      disabled={updateRoleMutation.isPending}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Selecionar perfil" />
                      </SelectTrigger>
                      <SelectContent>
                        {PANEL_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {getPanelRoleLabel(role)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
