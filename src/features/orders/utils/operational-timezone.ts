"use client";

export function getZonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const values = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = getZonedParts(date, timeZone);
  const utcTime = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return utcTime - date.getTime();
}

export function zonedDateTimeToUtcDate(
  value: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
  },
  timeZone: string,
) {
  const utcGuess = Date.UTC(
    value.year,
    value.month - 1,
    value.day,
    value.hour,
    value.minute,
    value.second,
  );

  let offset = getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
  let result = utcGuess - offset;
  const adjustedOffset = getTimeZoneOffsetMs(new Date(result), timeZone);

  if (adjustedOffset !== offset) {
    offset = adjustedOffset;
    result = utcGuess - offset;
  }

  return new Date(result);
}

export function addDaysToZonedDate(
  value: { year: number; month: number; day: number },
  days: number,
) {
  const utcDate = new Date(Date.UTC(value.year, value.month - 1, value.day + days));

  return {
    year: utcDate.getUTCFullYear(),
    month: utcDate.getUTCMonth() + 1,
    day: utcDate.getUTCDate(),
  };
}

export function formatOperationalDateTime(
  value?: string | null,
  timeZone = "Europe/Lisbon",
) {
  if (!value) {
    return "Por agendar";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-PT", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(parsed);
}

export function getDateInputValueInTimeZone(
  value?: string | null,
  timeZone = "Europe/Lisbon",
) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const parts = getZonedParts(parsed, timeZone);

  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function getTimeInputValueInTimeZone(
  value?: string | null,
  timeZone = "Europe/Lisbon",
) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const parts = getZonedParts(parsed, timeZone);

  return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}
