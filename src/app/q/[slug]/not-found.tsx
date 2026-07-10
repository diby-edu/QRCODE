import { StatusScreen } from "@/components/scan/ScanShell";

export default function ScanNotFound() {
  return (
    <StatusScreen icon="🔍" titleKey="notFound.title" messageKey="notFound.message" />
  );
}
