-- Abonnements trimestriels et annuels, en plus du mensuel.
--
-- Trois prix EXPLICITES par plan plutôt qu'un prix mensuel assorti d'un
-- pourcentage de remise : ça permet d'arrondir librement (100 000 se retient
-- et s'annonce mieux que 100 800) et d'ajuster un plan sans toucher aux
-- autres. Une remise calculée condamnerait aux prix bancals.
--
-- Une colonne à NULL signifie « cette durée n'est pas proposée pour ce plan »
-- — utile pour n'ouvrir l'annuel que sur certains plans, ou pour le plan
-- gratuit, qui n'a de prix pour aucune durée.

alter table public.plans
  add column if not exists price_quarterly numeric,
  add column if not exists price_yearly numeric;

comment on column public.plans.price_quarterly is
  'Prix pour 3 mois. NULL = durée non proposée pour ce plan.';
comment on column public.plans.price_yearly is
  'Prix pour 12 mois. NULL = durée non proposée pour ce plan.';

-- Grille arrêtée avec l'utilisateur. L'écart entre trimestre (~13%) et année
-- (~30%) est volontaire : il doit rester assez large pour que l'engagement
-- annuel soit clairement le meilleur choix. Une remise trimestrielle trop
-- forte cannibaliserait l'annuel sans apporter l'engagement qui la justifie.
--
-- Le contexte pèse dans ce choix : l'application n'a PAS de renouvellement
-- automatique. Chaque échéance oblige le client à repayer à la main, donc
-- chaque échéance est une occasion de le perdre. Pousser vers les durées
-- longues a ici une valeur qui dépasse la seule trésorerie.
update public.plans set price_quarterly =  6500, price_yearly =  21000 where name = 'Starter';
update public.plans set price_quarterly = 19500, price_yearly =  63000 where name = 'Pro';
update public.plans set price_quarterly = 31000, price_yearly = 100000 where name = 'Business';
-- Le plan gratuit reste sans prix, quelle que soit la durée.
update public.plans set price_quarterly = null, price_yearly = null where price_monthly = 0;

-- ------------------------------------------------------------------
-- Durée retenue, conservée sur l'abonnement
-- ------------------------------------------------------------------
-- current_period_end porte déjà l'échéance, mais pas l'intention : sans cette
-- colonne, impossible de distinguer a posteriori un annuel d'un mensuel
-- renouvelé onze fois, ni de mesurer quelle durée se vend.
alter table public.subscriptions
  add column if not exists billing_period text not null default 'monthly'
    check (billing_period in ('monthly', 'quarterly', 'yearly'));

-- L'existant est mensuel : c'était la seule durée possible jusqu'ici.
update public.subscriptions set billing_period = 'monthly' where billing_period is null;

-- ------------------------------------------------------------------
-- Durée -> nombre de jours, source unique
-- ------------------------------------------------------------------
-- Jusqu'ici « +30 jours » était écrit en dur à trois endroits du code
-- (setUserPlan, recordManualPayment, verifyAndActivate). Les trois chemins
-- d'activation appellent désormais la même règle.
create or replace function public.billing_period_days(p_period text)
returns integer
language sql
immutable
as $$
  select case p_period
    when 'yearly' then 365
    when 'quarterly' then 90
    else 30
  end;
$$;
