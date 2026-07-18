import { useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { crmApi } from '../api/endpoints';

interface Props {
  callId: string;
  recordingUrl: string | null;
  onUploaded?: () => void;
}

export function CallRecording({ callId, recordingUrl, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const upload = useMutation({
    mutationFn: (file: File) => crmApi.uploadRecording(callId, file),
    onSuccess: () => onUploaded?.(),
  });

  if (recordingUrl) {
    return <audio className="rec-audio" controls preload="none" src={recordingUrl} />;
  }

  return (
    <>
      <input
        type="file"
        accept="audio/*"
        hidden
        ref={inputRef}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload.mutate(f);
        }}
      />
      <button
        className="btn btn-ghost btn-sm"
        disabled={upload.isPending}
        onClick={() => inputRef.current?.click()}
        title="Завантажити аудіозапис дзвінка"
      >
        {upload.isPending ? '⏳' : '🎙 Запис'}
      </button>
    </>
  );
}
