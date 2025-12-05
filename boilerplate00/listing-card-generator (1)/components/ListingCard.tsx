import React from 'react';
import { ListingData } from '../types';

interface ListingCardProps {
  data: ListingData;
}

export const ListingCard: React.FC<ListingCardProps> = ({ data }) => {
  return (
    <div className="w-full max-w-sm mx-auto bg-white shadow-xl overflow-hidden border border-gray-300">
      {/* Cyan Header - Exactly matching the screenshot style */}
      <div className="bg-[#00FFFF] py-5 px-2 text-center border-b border-gray-300">
        <h2 className="text-2xl font-bold text-black leading-tight tracking-tight font-sans">
          가격/bed&bath/평수<br />
          /주소/이름
        </h2>
      </div>

      {/* Content Body */}
      <div className="p-8 flex flex-col items-center justify-center text-center">
        {/* Unit Name (e.g. B6) */}
        <div className="text-4xl font-normal text-black mb-2">
          {data.unitName || "-"}
        </div>

        {/* Price */}
        <div className="text-3xl text-black font-normal mb-1">
          {data.price || "Price TBD"}
        </div>

        {/* Bed/Bath & Sqft */}
        <div className="text-3xl text-black font-normal mb-1">
          {data.beds}&{data.baths} · {data.sqft} Sqft.
        </div>

        {/* Complex Name & Address */}
        <div className="text-3xl text-black font-normal leading-tight mt-1">
          {data.complexName && <div>{data.complexName}</div>}
          <div className="mt-1">{data.fullAddress}</div>
        </div>
      </div>
    </div>
  );
};