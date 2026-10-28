-- REMISE A ZERO DES DONNEES DANS SUPABASE (mise en service de la synchronisation ligne par ligne)
--
-- ATTENTION : efface definitivement produits, services, clients, ventes, depenses, stock,
-- cybercafe, historique et numerotation web. Les comptes utilisateurs sont conserves.
-- A utiliser une seule fois, juste avant la mise en service, quand les donnees actuelles ne sont pas definitives.
-- Faites d'abord une sauvegarde (voir MISE_EN_SERVICE_SYNCHRONISATION.md).
--
-- Pour confirmer, remplacez 'NON' par 'OUI' ci-dessous, puis executez le script dans Supabase > SQL Editor.

do $$
declare
  confirmation text := 'NON';
begin
  if confirmation <> 'OUI' then
    raise exception 'Remise a zero annulee : remplacez NON par OUI dans le script pour confirmer.';
  end if;

  -- TRUNCATE ne declenche pas les traces de suppression : les postes repartent tous de zero.
  truncate table
    public.sale_items,
    public.sale_service_items,
    public.stock_movements,
    public.sales,
    public.replenishments,
    public.initial_stocks,
    public.expenses,
    public.cybercafe_sales,
    public.mikhmon_sales,
    public.audit_logs,
    public.clients,
    public.products,
    public.services,
    public.cybercafe_tariffs,
    public.inventory_cycles,
    public.invoice_sequences,
    public.sync_tombstones,
    public.sync_devices
  restart identity cascade;
end;
$$;
