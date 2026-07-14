import {
  Apple,
  Bike,
  BookOpen,
  Boxes,
  Cat,
  ChefHat,
  CircleDot,
  Footprints,
  HardHat,
  Music,
  PersonStanding,
  Soup,
} from "lucide-react";

export function QuestionScene({ src, alt }: { src: string; alt: string }) {
  const key = src.replace(/^scene:/, "");
  const Icon =
    key.includes("reading")
      ? BookOpen
      : key.includes("bicycle")
        ? Bike
        : key.includes("apple")
          ? Apple
          : key.includes("cat")
            ? Cat
            : key.includes("box")
              ? Boxes
              : key.includes("cooking") || key.includes("kitchen")
                ? ChefHat
                : key.includes("dancing")
                  ? Music
                  : key.includes("soccer")
                    ? CircleDot
                    : key.includes("running")
                      ? Footprints
                      : key.includes("hat") || key.includes("hook")
                        ? HardHat
                        : key.includes("lunch")
                          ? Soup
                          : PersonStanding;

  return (
    <figure className="question-scene" role="img" aria-label={alt}>
      <span className="scene-sun" aria-hidden="true" />
      <span className="scene-ground" aria-hidden="true" />
      <Icon className="scene-icon" aria-hidden="true" />
    </figure>
  );
}
