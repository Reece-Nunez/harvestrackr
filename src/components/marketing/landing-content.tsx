import Link from "next/link";
import Image from "next/image";

export function LandingContent() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="flex flex-col items-center text-center px-4 pt-16 pb-8">
        <h1 className="text-3xl sm:text-5xl font-extrabold mb-4 text-foreground">
          Track Every Penny. Grow Every Acre.
        </h1>
        <p className="text-base sm:text-xl max-w-3xl text-muted-foreground">
          HarvesTrackr helps farmers easily track expenses, analyze spending,
          and grow profits with powerful yet simple tools.
        </p>
      </section>

      {/* Demo Video */}
      <section className="w-full px-4 sm:px-0 max-w-5xl mx-auto pb-16">
        <div
          style={{
            position: "relative",
            paddingBottom: "calc(54.63888888888889% + 41px)",
            height: 0,
            width: "100%",
          }}
        >
          <iframe
            src="https://demo.arcade.software/TFydEkCEIQUEBa0Rmc59?embed&embed_mobile=tab&embed_desktop=inline&show_copy_link=true"
            title="Experience Effortless Farm Management with HarvestTrackr"
            frameBorder="0"
            loading="lazy"
            allowFullScreen
            allow="clipboard-write"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              colorScheme: "light",
              borderRadius: "12px",
            }}
          />
        </div>
      </section>
    </div>
  );
}
