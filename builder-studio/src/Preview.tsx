import { SHELL_BASE } from "./api";

/**
 * Phone-frame iframe pointing at the Mini App Shell. Bump `version` to force
 * the iframe to reload after the user saves changes.
 */
export function Preview({
  appId,
  version,
}: {
  appId: string;
  version: number;
}) {
  return (
    <div
      className="rounded-[32px] bg-black p-2 shadow-xl"
      style={{ width: 320 }}
    >
      <div
        className="overflow-hidden bg-white rounded-[24px] relative"
        style={{ width: 304, height: 560 }}
      >
        <iframe
          key={version}
          src={`${SHELL_BASE}/?appId=${encodeURIComponent(appId)}`}
          className="w-full h-full border-0"
          title="Mini App preview"
        />
      </div>
    </div>
  );
}
