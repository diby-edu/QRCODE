// Blocs média partagés entre les landings qui affichent des photos ou une
// vidéo hébergée (galerie, fiche entreprise, lecteur vidéo dédié…) — évite
// que chaque landing réimplémente sa propre grille ou son propre <video>.

/** Grille de miniatures cliquables (ouvre l'original dans un nouvel onglet). */
export function PhotoGrid({
  photos,
  altPrefix,
}: {
  photos: string[];
  altPrefix: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {photos.map((url, i) => (
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
            alt={`${altPrefix} ${i + 1}`}
            loading="lazy"
            className="aspect-square w-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
        </a>
      ))}
    </div>
  );
}

/** Lecteur vidéo HTML5 pour un fichier hébergé sur Supabase Storage. */
export function VideoPlayer({
  src,
  poster,
  title,
  className = "aspect-video w-full bg-slate-950",
}: {
  src: string;
  poster?: string;
  title: string;
  className?: string;
}) {
  return (
    <video
      controls
      playsInline
      preload="metadata"
      poster={poster || undefined}
      src={src}
      className={className}
    >
      {title}
    </video>
  );
}
