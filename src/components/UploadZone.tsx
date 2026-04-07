import { useRef } from "react";

import { Loader2, UploadCloud } from "lucide-react";
import { motion } from "motion/react";

interface UploadZoneProps {
  isUploading: boolean;
  onInvalidFile: (message: string) => void;
  onUpload: (file: File) => Promise<void>;
}

export function UploadZone({ isUploading, onInvalidFile, onUpload }: UploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | undefined, resetInput?: () => void) {
    if (!file) {
      return;
    }

    if (!isCsvFile(file)) {
      resetInput?.();
      onInvalidFile("Only CSV files can be uploaded.");
      return;
    }

    void onUpload(file);
  }

  return (
    <motion.div
      animate={{ opacity: 1, scale: 1 }}
      className="relative group"
      initial={{ opacity: 0, scale: 0.95 }}
    >
      <div className="absolute -inset-1 bg-linear-to-r from-primary to-primary-container rounded-3xl blur opacity-10 transition duration-1000 group-hover:opacity-25" />
      <div
        className="relative bg-surface-container-low rounded-3xl border-2 border-dashed border-primary-container/30 h-80 flex flex-col items-center justify-center p-12 transition-all hover:bg-white/40"
        data-testid="upload-zone"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          handleFile(event.dataTransfer.files[0]);
        }}
      >
        <div className="w-20 h-20 rounded-full bg-secondary-container/30 flex items-center justify-center mb-6">
          {isUploading ? (
            <Loader2 className="w-10 h-10 text-primary-container animate-spin" />
          ) : (
            <UploadCloud className="w-10 h-10 text-primary-container" />
          )}
        </div>
        <h2 className="text-2xl font-bold font-headline mb-2">Drag a CSV file here</h2>
        <p className="text-on-surface-variant mb-8 text-center max-w-sm">
          Upload a dataset result file and watch it move through the background processing
          lifecycle.
        </p>
        <input
          accept=".csv,text/csv"
          className="hidden"
          data-testid="upload-input"
          onChange={(event) => {
            handleFile(event.target.files?.[0], () => {
              event.target.value = "";
            });
          }}
          ref={fileInputRef}
          type="file"
        />
        <button
          className="bg-primary-container text-white px-10 py-4 rounded-full font-bold shadow-xl shadow-primary-container/20 hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-50 disabled:scale-100"
          data-testid="browse-files"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          {isUploading ? "Uploading..." : "Choose File"}
        </button>
      </div>
    </motion.div>
  );
}

function isCsvFile(file: File) {
  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();

  return (
    fileName.endsWith(".csv") ||
    fileType === "text/csv" ||
    fileType === "application/csv" ||
    fileType === "application/vnd.ms-excel"
  );
}
