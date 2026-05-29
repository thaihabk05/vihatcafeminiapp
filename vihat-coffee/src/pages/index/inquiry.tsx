import React from "react";
import { FC } from "react";
import { Box, Input, useNavigate } from "zmp-ui";
import { getConfig } from "utils/config";

export const Inquiry: FC = () => {
  const navigate = useNavigate();
  const brand = getConfig((c) => c.app.title);
  return (
    <Box p={4} className="bg-white">
      <Input.Search
        onFocus={() => navigate("/search")}
        placeholder={`${brand} · Tìm món, đồ uống ...`}
      />
    </Box>
  );
};
