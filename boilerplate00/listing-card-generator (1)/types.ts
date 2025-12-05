export interface ListingData {
  unitName: string;
  price: string;
  beds: number | string;
  baths: number | string;
  sqft: string;
  complexName: string;
  fullAddress: string;
}

export enum LoadingState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}