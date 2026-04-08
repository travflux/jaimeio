export interface WhiteLabelConfig {
  portal_name: string;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  support_email: string;
  hide_jaimeio_branding: boolean;
  custom_domain: string | null;
  custom_domain_verified: boolean;
  custom_domain_verified_at: string | null;
  show_network_links: boolean;
  custom_support_link_text: string | null;
}

export const DEFAULT_WHITE_LABEL_CONFIG: WhiteLabelConfig = {
  portal_name: 'JAIME.IO',
  logo_url: null,
  favicon_url: null,
  primary_color: '#0F2D5E',
  secondary_color: '#2DD4BF',
  support_email: 'support@getjaime.io',
  hide_jaimeio_branding: false,
  custom_domain: null,
  custom_domain_verified: false,
  custom_domain_verified_at: null,
  show_network_links: true,
  custom_support_link_text: null,
};
