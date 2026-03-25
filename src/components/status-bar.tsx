// TODO: temporary test block — remove me
const TEMP_VERSION = "0.0.0-test";

export function StatusBar() {
  console.log("test: status bar rendered", TEMP_VERSION);
  return (
    <div className="draglayer h-10 shrink-0 border-sidebar-border border-b bg-sidebar" />
  );
}
