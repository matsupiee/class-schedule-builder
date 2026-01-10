"use client";

import { useEffect, useState } from "react";

import { Input } from "./input";
import { useDebounce } from "@/hooks/use-debounce";

type DebouncedInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "onChange"
> & {
  value: string | number;
  onChange: (value: string) => void;
};

export const DebouncedInput = (inputProps: DebouncedInputProps) => {
  const { value, onChange, ...rest } = inputProps;

  const [localValue, setLocalValue] = useState(
    value === "" ? "" : String(value)
  );
  const debouncedOnChange = useDebounce(onChange, 500);

  useEffect(() => {
    setLocalValue(value === "" ? "" : String(value));
  }, [value]);

  return (
    <Input
      {...rest}
      value={localValue}
      onChange={(e) => {
        setLocalValue(e.target.value);
        debouncedOnChange(e.target.value);
      }}
    />
  );
};

