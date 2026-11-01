-- Vente en gros : rame, boite, paquet... (version 1.4.0)
--
-- A executer une fois dans Supabase > SQL Editor AVANT d'installer la version 1.4.0 sur les PC
-- et avant la mise a jour du site web. Le script peut etre relance sans risque.
-- Il faut que supabase-credit-migration.sql ait deja ete execute.
--
-- Le stock reste compte a l'unite (feuilles, stylos...).
-- products.pack_label / pack_size / pack_price : nom du lot, unites par lot, prix du lot (vide = vente a l'unite seulement)
-- sale_items.pack_label / pack_count / pack_size : lot vendu sur la ligne (vide = vendu a l'unite).
--   sale_items.quantity reste le nombre d'unites sorties du stock.

alter table public.products add column if not exists pack_label text;
alter table public.products add column if not exists pack_size integer;
alter table public.products add column if not exists pack_price numeric(12, 2);

alter table public.sale_items add column if not exists pack_label text;
alter table public.sale_items add column if not exists pack_count integer;
alter table public.sale_items add column if not exists pack_size integer;

-- Recharge le cache de l'API pour que les nouvelles colonnes soient visibles tout de suite.
notify pgrst, 'reload schema';
