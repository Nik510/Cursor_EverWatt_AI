import React, { useRef } from 'react';

interface FileUploadProps {
  label: string;
  description: string;
  acceptedFormats: string;
  onFileSelect: (file: File | null) => void;
  file?: File;
  isRequired?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  label,
  description,
  acceptedFormats,
  onFileSelect,
  file,
  isRequired = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    console.log('FileUpload handleDrop called, files:', e.dataTransfer.files.length);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      console.log('File dropped:', droppedFile.name, 'Size:', droppedFile.size);
      onFileSelect(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('FileUpload handleFileInput called, files:', e.target.files?.length || 0);
    const inputEl = e.currentTarget;
    const selectedFile = inputEl.files?.[0];
    if (selectedFile) {
      console.log('File selected:', selectedFile.name, 'Size:', selectedFile.size);
      // Call the parent's onFileSelect handler immediately
      onFileSelect(selectedFile);
      // Important: clear the native input value so selecting the SAME file again
      // will still trigger an onChange event.
      inputEl.value = '';
    } else {
      console.log('No file selected in input');
      // Only clear if input was explicitly cleared (not just re-rendered)
      // Don't call onFileSelect(null) here as it might be a re-render
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {isRequired && <span className="text-red-500 ml-1">*</span>}
      </label>
      <p className="text-xs text-gray-500">{description}</p>
      
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="relative border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats}
          onClick={(e) => {
            // Also clear on click so re-selecting the same file reliably triggers onChange
            (e.currentTarget as HTMLInputElement).value = '';
          }}
          onChange={handleFileInput}
          // Make the input itself clickable (more reliable than inputRef.click() on a display:none input)
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        {file ? (
          <div className="space-y-2">
            <div className="text-green-600 text-4xl mb-2">✓</div>
            <p className="text-sm font-medium text-gray-900">{file.name}</p>
            <p className="text-xs text-gray-500">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFileSelect(null);
              }}
              className="relative z-10 text-xs text-red-600 hover:text-red-700 mt-2"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="space-y-2 pointer-events-none">
            <div className="text-gray-400 text-4xl mb-2">📄</div>
            <p className="text-sm text-gray-600">
              Drag and drop your file here, or click to browse
            </p>
            <p className="text-xs text-gray-400">
              Supported formats: {acceptedFormats}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

