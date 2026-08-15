import type { HotelAmenityGroup } from '@/constants/hotelAmenities';

export function AmenityChecklist({
  groups,
  legend,
  name,
}: {
  groups: readonly HotelAmenityGroup[];
  legend: string;
  name: string;
}) {
  return (
    <fieldset className="amenity-checklist">
      <legend>{legend}</legend>
      {groups.map((group) => (
        <section className="amenity-checklist__group" key={group.name}>
          <h3>{group.name}</h3>
          <div className="amenity-checklist__options">
            {group.options.map((amenity) => (
              <label key={`${group.name}-${amenity.value}`}>
                <input name={name} type="checkbox" value={amenity.value} />
                <span>{amenity.label}</span>
              </label>
            ))}
          </div>
        </section>
      ))}
    </fieldset>
  );
}
