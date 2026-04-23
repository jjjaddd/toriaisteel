(function(global) {
  'use strict';

  var ns = global.Toriai = global.Toriai || {};
  ns.storage = ns.storage || {};

  ns.storage.keys = {
    settings: 'so_settings',
    remnants: 'so_remnants',
    history: 'so_history',
    cutHistory: 'so_cut_hist_v2',
    inventory: 'so_inventory_v2',
    cart: 'so_cart_v1',
    workHistory: 'so_work_hist_v1',
    inventorySelectedRemnants: 'toriai_inventory_remnant_selected_v1',
    manualRemnants: 'toriai_manual_remnants_v2',
    inventoryRemnantUsage: 'toriai_inventory_remnant_usage_v2',
    onboardingVersion: 'toriai_calc_onboarding_seen_version',
    weightSavedCalcs: 'wSavedCalcs',
    weightJobName: 'wJobName',
    weightJobClient: 'wJobClient',
    weightDocTitle: 'wDocTitle',
    weightNotes: 'toriai_wnotes',
    customMaterials: 'toriai_custom_materials'
  };
})(window);
