import React, { FC } from "react";
import { Pagination } from "swiper";
import { Swiper, SwiperSlide } from "swiper/react";
import { Box } from "zmp-ui";
import { useRecoilValue } from "recoil";
import { bannersState } from "state";

export const Banner: FC = () => {
  const banners = useRecoilValue(bannersState);
  if (!banners || banners.length === 0) return null;

  return (
    <Box className="bg-white" pb={4}>
      <Swiper
        modules={[Pagination]}
        pagination={{ clickable: true }}
        autoplay
        loop
        cssMode
      >
        {banners.map((banner) => (
          <SwiperSlide key={banner.id} className="px-4">
            <Box
              className="w-full rounded-lg aspect-[2/1] bg-cover bg-center bg-skeleton"
              style={{ backgroundImage: `url(${banner.image})` }}
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </Box>
  );
};
