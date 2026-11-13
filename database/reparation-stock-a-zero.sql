-- REPARATION : stock a zero apres la synchro d'un nouveau PC (13/11/2026).
-- Les mouvements de stock sont tous sous le cycle id 2 (100 mouvements, 7296 unites).
-- Un autre cycle a recu une date de debut plus recente et passe pour le cycle en cours (vide).
-- On recule la date de tout cycle qui passe devant le cycle 2. Rien n'est supprime.
-- modified_at = now() pour que les PC recuperent la correction a leur prochaine synchro.

update public.inventory_cycles
set started_at = (select started_at from public.inventory_cycles where id = 2) - interval '1 day',
    modified_at = now()
where id <> 2
  and started_at >= (select started_at from public.inventory_cycles where id = 2);

-- Verification : le cycle 2 doit etre en premier, et le stock doit revenir.
select id, label, started_at from public.inventory_cycles order by started_at desc, id desc;
select public.current_inventory_cycle_id() as cycle_en_cours;  -- doit afficher 2
select sum(current_stock) as stock_total from public.current_stock_view;
