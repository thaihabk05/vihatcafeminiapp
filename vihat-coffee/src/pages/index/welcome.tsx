import React, { FC } from "react";
import { Box, Header, Text } from "zmp-ui";
import logo from "static/logo.png";
import { getConfig } from "utils/config";

export const Welcome: FC = () => {
  const title = getConfig((c) => c.app.title);
  const tagline = getConfig((c) => (c as any).app?.tagline);
  const headerLogo = getConfig((c) => c.template.headerLogo);

  return (
    <Header
      className="app-header no-border pl-4 flex-none pb-[6px]"
      showBackIcon={false}
      title={
        (
          <Box flex alignItems="center" className="space-x-2">
            <img
              className="w-8 h-8 rounded-lg border-inset"
              src={headerLogo || logo}
            />
            <Box>
              <Text.Title size="small">{title}</Text.Title>
              {tagline ? (
                <Text size="xxSmall" className="text-gray">
                  {tagline}
                </Text>
              ) : null}
            </Box>
          </Box>
        ) as unknown as string
      }
    />
  );
};
