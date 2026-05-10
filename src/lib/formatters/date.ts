import { format, parseISO, isValid } from "date-fns";
import { pt } from "date-fns/locale";

export const DATE_FORMATS = {
  display: "dd/MM/yyyy",
  displayWithTime: "dd/MM/yyyy HH:mm",
  iso: "yyyy-MM-dd",
  time: "HH:mm",
};

export function formatDate(date: string | Date | null | undefined, formatStr: string = DATE_FORMATS.display): string {
  if (!date) return "-";
  
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  
  if (!isValid(dateObj)) return "-";
  
  return format(dateObj, formatStr, { locale: pt });
}

export function formatDateTime(date: string | Date | null | undefined): string {
  return formatDate(date, DATE_FORMATS.displayWithTime);
}
