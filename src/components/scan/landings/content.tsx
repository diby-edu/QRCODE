import { getTranslations } from "next-intl/server";
import { str, strArr, type LandingProps } from "./util";

/** Document PDF : visionneuse intégrée + boutons ouvrir/télécharger. */
export async function PdfLanding({ title, data }: LandingProps) {
  const t = await getTranslations("scan.pdf");
  const url = str(data.file);
  const docTitle = str(data.title) || title;

  return (
    <div className="card p-6">
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl">
          📄
        </span>
        <h1 className="mt-3 text-lg font-bold text-slate-900">{docTitle}</h1>
        {str(data.description) && (
          <p className="mt-1 text-sm text-slate-500">{str(data.description)}</p>
        )}
      </div>

      {url && (
        <>
          <div className="mt-5 flex gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary flex-1"
            >
              {t("open")}
            </a>
            <a href={url} download className="btn-secondary flex-1">
              {t("download")}
            </a>
          </div>
          <iframe
            src={url}
            title={docTitle}
            className="mt-4 hidden h-[65vh] w-full rounded-xl border border-slate-200 sm:block"
          />
        </>
      )}
    </div>
  );
}

/** Galerie d'images. */
export async function ImagesLanding({ title, data }: LandingProps) {
  const t = await getTranslations("scan.images");
  const files = strArr(data.files);
  const galleryTitle = str(data.title) || title;

  return (
    <div className="card p-6">
      <div className="text-center">
        <h1 className="text-lg font-bold text-slate-900">{galleryTitle}</h1>
        {str(data.description) && (
          <p className="mt-1 text-sm text-slate-500">{str(data.description)}</p>
        )}
        <p className="mt-1 text-xs text-slate-400">
          {t("photos", { count: files.length })}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {files.map((url, i) => (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="group overflow-hidden rounded-xl border border-slate-100 bg-slate-50"
          >
            {/* Fichiers Supabase Storage : domaine variable, next/image inutile ici */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`${galleryTitle} ${i + 1}`}
              loading="lazy"
              className="aspect-square w-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
          </a>
        ))}
      </div>
    </div>
  );
}

/** Lecteur audio MP3. */
export async function Mp3Landing({ title, data }: LandingProps) {
  const url = str(data.file);
  const cover = str(data.cover);
  const trackTitle = str(data.title) || title;

  return (
    <div className="card p-8 text-center">
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover}
          alt={trackTitle}
          className="mx-auto h-40 w-40 rounded-2xl object-cover shadow-md"
        />
      ) : (
        <span className="mx-auto flex h-40 w-40 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 text-6xl shadow-md">
          🎵
        </span>
      )}
      <h1 className="mt-5 text-lg font-bold text-slate-900">{trackTitle}</h1>
      {str(data.artist) && (
        <p className="mt-1 text-sm text-slate-500">{str(data.artist)}</p>
      )}
      {url && (
        <audio controls preload="metadata" src={url} className="mt-6 w-full">
          {trackTitle}
        </audio>
      )}
    </div>
  );
}

/** Lecteur vidéo (fichier hébergé sur Supabase Storage). */
export async function VideoFileLanding({ title, data }: LandingProps) {
  const url = str(data.file);
  const cover = str(data.cover);
  const videoTitle = str(data.title) || title;

  return (
    <div className="card overflow-hidden">
      {url && (
        <video
          controls
          playsInline
          preload="metadata"
          poster={cover || undefined}
          src={url}
          className="aspect-video w-full bg-slate-950"
        >
          {videoTitle}
        </video>
      )}
      <div className="p-6">
        <h1 className="text-lg font-bold text-slate-900">{videoTitle}</h1>
        {str(data.description) && (
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
            {str(data.description)}
          </p>
        )}
      </div>
    </div>
  );
}

/** Texte simple. */
export async function TextLanding({ title, data }: LandingProps) {
  const textTitle = str(data.title) || title;
  return (
    <div className="card p-8">
      <h1 className="text-lg font-bold text-slate-900">{textTitle}</h1>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
        {str(data.content)}
      </p>
    </div>
  );
}
