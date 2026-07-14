"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";

type MissionRadioChoice = Readonly<{ id: string }>;

type MissionRadioGroupProps<T extends MissionRadioChoice> = Readonly<{
  ariaLabel: string;
  className: string;
  options: ReadonlyArray<T>;
  selectedId?: string | null;
  onSelect: (id: T["id"]) => void;
  renderOption: (option: T, selected: boolean) => ReactNode;
  optionClassName?: (option: T, selected: boolean) => string;
}>;

export function MissionRadioGroup<T extends MissionRadioChoice>({
  ariaLabel,
  className,
  options,
  selectedId,
  onSelect,
  renderOption,
  optionClassName,
}: MissionRadioGroupProps<T>) {
  const optionRefs = useRef(new Map<string, HTMLButtonElement>());
  const selectedIndex = options.findIndex((option) => option.id === selectedId);
  const tabbableIndex = selectedIndex >= 0 ? selectedIndex : 0;

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number;
    if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = options.length - 1;
    } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (index + 1) % options.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (index - 1 + options.length) % options.length;
    } else {
      return;
    }

    event.preventDefault();
    const nextOption = options[nextIndex];
    if (!nextOption) return;

    onSelect(nextOption.id);
    optionRefs.current.get(nextOption.id)?.focus();
  }

  return (
    <div className={className} role="radiogroup" aria-label={ariaLabel}>
      {options.map((option, index) => {
        const selected = option.id === selectedId;
        return (
          <button
            className={optionClassName?.(option, selected)}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={index === tabbableIndex ? 0 : -1}
            key={option.id}
            ref={(node) => {
              if (node) {
                optionRefs.current.set(option.id, node);
              } else {
                optionRefs.current.delete(option.id);
              }
            }}
            onClick={() => onSelect(option.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {renderOption(option, selected)}
          </button>
        );
      })}
    </div>
  );
}
