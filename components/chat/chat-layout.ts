export const chatPanelPaddingClass = "px-4 sm:px-6";
export const chatMessageColumnClass = "mx-auto w-full max-w-2xl";
export const chatInputColumnClass = `mx-auto w-full max-w-3xl ${chatPanelPaddingClass}`;
export const chatScrollerContentClass = `flex h-max min-h-full w-full flex-col gap-6 py-6 ${chatPanelPaddingClass}`;
export const chatFooterSpacerClass = "pb-44";
export const chatFloatingFooterClass =
  "pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col";
export const chatFooterFadeClass =
  "h-14 shrink-0 bg-gradient-to-t from-background via-background/70 to-transparent";
export const chatFooterInputAreaClass = "pointer-events-auto bg-background pb-4";
export const chatScrollButtonClass = "data-[direction=end]:bottom-[10.5rem]";

/** @deprecated Use chatInputColumnClass */
export const chatContentClass = chatInputColumnClass;
