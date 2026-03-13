import { Metadata } from "next";
import { Leaf, Target, Users, Heart } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about HarvesTrackr and our mission to help farmers manage their operations more efficiently.",
};

const values = [
  {
    icon: Target,
    title: "Simplicity",
    description:
      "We believe farm management software should be easy to use. No complex setups, no steep learning curves - just intuitive tools that work.",
  },
  {
    icon: Users,
    title: "Farmer-First",
    description:
      "Every feature we build starts with listening to real farmers. Your feedback shapes our roadmap and helps us serve you better.",
  },
  {
    icon: Heart,
    title: "Sustainability",
    description:
      "We're committed to helping farms of all sizes thrive. By making professional tools accessible, we support the future of agriculture.",
  },
];

const team = [
  {
    name: "Alex Johnson",
    role: "Founder & CEO",
    bio: "Third-generation farmer turned software engineer. Alex built HarvesTrackr to solve problems he experienced firsthand.",
  },
  {
    name: "Sarah Chen",
    role: "Head of Product",
    bio: "Former agricultural consultant with 10+ years helping farms optimize their operations.",
  },
  {
    name: "Marcus Williams",
    role: "Lead Developer",
    bio: "Full-stack developer passionate about creating tools that make a real difference for small businesses.",
  },
  {
    name: "Emily Rodriguez",
    role: "Customer Success",
    bio: "Dedicated to ensuring every farmer gets the most out of HarvesTrackr. Former farm manager.",
  },
];

export default function AboutPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-green-50 to-background py-20 dark:from-green-950/20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center rounded-full border border-green-200 bg-green-100 px-4 py-1.5 text-sm font-medium text-green-800 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300">
              <Leaf className="mr-2 h-4 w-4" />
              Our Story
            </div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Built by Farmers, for Farmers
            </h1>
            <p className="text-lg text-muted-foreground sm:text-xl">
              HarvesTrackr was born from a simple idea: farmers deserve modern
              tools that are as hardworking as they are.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="mb-6 text-3xl font-bold tracking-tight text-foreground">
                Our Mission
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Agriculture is the backbone of our communities, yet many
                  farmers still struggle with outdated spreadsheets, paper
                  receipts, and disconnected systems to manage their
                  operations.
                </p>
                <p>
                  We started HarvesTrackr to change that. Our mission is to
                  provide every farmer - from small family operations to large
                  commercial farms - with the professional tools they need to
                  track expenses, manage income, and make better business
                  decisions.
                </p>
                <p>
                  We believe that when farmers have clear visibility into their
                  finances and operations, they can focus on what they do best:
                  growing food and building sustainable businesses that feed our
                  world.
                </p>
              </div>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-green-100 to-green-200 p-8 dark:from-green-900/30 dark:to-green-800/20">
              <div className="grid gap-6">
                <div className="rounded-xl bg-white/80 p-6 shadow-sm dark:bg-background/80">
                  <div className="text-4xl font-bold text-green-600">10,000+</div>
                  <div className="text-muted-foreground">Active Farms</div>
                </div>
                <div className="rounded-xl bg-white/80 p-6 shadow-sm dark:bg-background/80">
                  <div className="text-4xl font-bold text-green-600">$50M+</div>
                  <div className="text-muted-foreground">Expenses Tracked</div>
                </div>
                <div className="rounded-xl bg-white/80 p-6 shadow-sm dark:bg-background/80">
                  <div className="text-4xl font-bold text-green-600">98%</div>
                  <div className="text-muted-foreground">Customer Satisfaction</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why HarvesTrackr Section */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-6 text-3xl font-bold tracking-tight text-foreground">
              Why HarvesTrackr?
            </h2>
            <p className="mb-12 text-lg text-muted-foreground">
              We&apos;re different because we understand farming. Here&apos;s what sets
              us apart.
            </p>
          </div>
          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
            {values.map((value) => (
              <div
                key={value.title}
                className="rounded-xl border bg-card p-6 text-center"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/20">
                  <value.icon className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-foreground">
                  {value.title}
                </h3>
                <p className="text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-6 text-3xl font-bold tracking-tight text-foreground">
              Meet the Team
            </h2>
            <p className="mb-12 text-lg text-muted-foreground">
              We&apos;re a small but dedicated team passionate about agriculture and
              technology.
            </p>
          </div>
          <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((member) => (
              <div
                key={member.name}
                className="rounded-xl border bg-card p-6 text-center"
              >
                <div className="mx-auto mb-4 h-24 w-24 rounded-full bg-gradient-to-br from-green-200 to-green-400 dark:from-green-800 dark:to-green-600" />
                <h3 className="mb-1 font-semibold text-foreground">
                  {member.name}
                </h3>
                <p className="mb-3 text-sm text-green-600">{member.role}</p>
                <p className="text-sm text-muted-foreground">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground">
              Join Our Growing Community
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Whether you&apos;re managing a small family garden or a large
              commercial operation, we&apos;re here to help you succeed.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <a
                href="/signup"
                className="inline-flex items-center justify-center rounded-lg bg-green-600 px-6 py-3 font-medium text-white transition-colors hover:bg-green-700"
              >
                Get Started Free
              </a>
              <a
                href="/contact"
                className="inline-flex items-center justify-center rounded-lg border bg-background px-6 py-3 font-medium text-foreground transition-colors hover:bg-muted"
              >
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
