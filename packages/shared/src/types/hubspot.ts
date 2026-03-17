export interface HubSpotContactProperties {
  session_count: number;
  last_style: string;
  last_color: string;
  last_session_date: string;
}

export interface HubSpotTimelineEvent {
  eventTemplateId: string;
  objectId: string;
  tokens: {
    session_id: string;
    style_label: string;
    glamour_photo_url?: string;
  };
}
