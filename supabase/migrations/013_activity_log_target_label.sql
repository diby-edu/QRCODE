-- Ajoute un libellé humain de la cible (email, titre de QR, nom de plan…)
-- capturé au moment de l'action — contrairement à un lookup a posteriori
-- sur l'id stocké dans "target", ça reste correct même si la ligne visée
-- est supprimée ensuite (ex: user.delete, qr.delete).
alter table public.admin_activity_log add column if not exists target_label text;
