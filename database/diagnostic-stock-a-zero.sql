-- DIAGNOSTIC (lecture seule, ne modifie rien) : stock a zero apres la synchro d'un nouveau PC.
-- A executer dans Supabase > SQL Editor. Copier les 2 resultats et les envoyer.

-- 1) Les cycles d'inventaire. Le stock affiche = celui du cycle avec le started_at le plus recent.
select ic.id,
       ic.label,
       ic.started_at,
       ic.modified_at,
       (select count(*) from public.stock_movements sm where sm.cycle_id = ic.id) as nb_mouvements,
       (select coalesce(sum(sm.quantity), 0) from public.stock_movements sm where sm.cycle_id = ic.id) as total_quantites
from public.inventory_cycles ic
order by ic.started_at desc, ic.id desc;

-- 2) Mouvements de stock par cycle (s'ils existent encore, les quantites sont recuperables).
select sm.cycle_id,
       count(*) as nb_mouvements,
       sum(sm.quantity) as total_quantites,
       min(sm.movement_date) as premier,
       max(sm.movement_date) as dernier
from public.stock_movements sm
group by sm.cycle_id
order by sm.cycle_id;
