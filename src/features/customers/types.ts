import type { Order } from "@/features/orders/types";

export type Customer = {
  id: number;
  name: string;
  phone: string | null;
  ordersCount: number;
};

export type CustomerDetail = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  nif: string | null;
  birthDate: string | null;
  createdAt: string | null;
  ordersCount: number;
  orders: Order[];
};

export type CustomerUpdatePayload = Pick<
  CustomerDetail,
  "name" | "email" | "phone" | "nif" | "birthDate"
>;
