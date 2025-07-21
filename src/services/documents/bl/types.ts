export interface BLHeader {
  bl_number: string;
  issue_date: string;
  onboard_date: string;
  shipper: string;
  consignee: string;
  notify_party: string;
  cnpj_consignee: string;
  place_of_receipt: string;
  port_of_loading: string;
  port_of_discharge: string;
  place_of_delivery: string;
  freight_term: string;
  cargo_description: string;
  ncm_codes: string;
  package_type: string;
  total_packages: string;
  total_weight_kg: string;
  total_volume_cbm: string;
  freight_value_usd: string;
  freight_value_brl: string;
  freight_agent: string;
  vessel_name: string;
  voy_number: string;
}

export interface BLContainer {
  container_number: string;
  container_size: string;
  seal_number: string;
  booking_number: string;
  total_packages: string;
  gross_weight_kg: string;
  volume_cbm: string;
  bl_number: string;
}

export interface BLProcessingResult {
  header: BLHeader;
  containers?: BLContainer[];
}