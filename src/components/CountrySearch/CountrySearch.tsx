import { forwardRef, useId, useMemo, useState, KeyboardEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faXmark } from "@fortawesome/free-solid-svg-icons";
import { ICovidResponse } from "../../models/models";
import { displayName, searchCountries } from "../../lib/countries";
import { LoadStatus } from "../../hooks/useCovidData";
import "./CountrySearch.scss";

interface CountrySearchProps {
  records: ICovidResponse[];
  byName: Map<string, ICovidResponse>;
  status: LoadStatus;
  recent: string[];
  onSelect: (record: ICovidResponse) => void;
  onClearRecent: () => void;
}

/** Accessible combobox (WAI-ARIA 1.2 list autocomplete pattern). */
const CountrySearch = forwardRef<HTMLInputElement, CountrySearchProps>(function CountrySearch(
  { records, byName, status, recent, onSelect, onClearRecent },
  inputRef
) {
  const id = useId();
  const listId = `${id}-list`;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const results = useMemo(() => searchCountries(records, query), [records, query]);
  const recentRecords = useMemo(
    () => recent.map((name) => byName.get(name.toLowerCase())).filter((r): r is ICovidResponse => !!r),
    [recent, byName]
  );

  const expanded = open && query.trim().length > 0;
  const disabled = status !== "ready";

  const choose = (record: ICovidResponse) => {
    onSelect(record);
    setQuery("");
    setOpen(false);
    setActive(0);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (results.length ? (a + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (results.length ? (a - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter") {
      if (expanded && results[active]) {
        e.preventDefault();
        choose(results[active]);
      }
    } else if (e.key === "Escape") {
      if (expanded) {
        e.preventDefault();
        setOpen(false);
      } else if (query) {
        setQuery("");
      }
    }
  };

  return (
    <div className="search">
      <div className="search__field">
        <FontAwesomeIcon icon={faMagnifyingGlass} className="search__icon" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label="Search for a country"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-activedescendant={expanded && results[active] ? `${id}-opt-${active}` : undefined}
          placeholder={status === "error" ? "Country data unavailable" : "Search for a country"}
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
        {query && (
          <button
            type="button"
            className="icon-button search__clear"
            aria-label="Clear search"
            onClick={() => setQuery("")}
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        )}
      </div>

      <ul id={listId} role="listbox" aria-label="Countries" className="search__list" hidden={!expanded}>
        {results.map((record, i) => (
          <li
            key={record.country}
            id={`${id}-opt-${i}`}
            role="option"
            aria-selected={i === active}
            className="search__option"
            // mousedown fires before the input's blur, so the click isn't lost.
            onMouseDown={(e) => {
              e.preventDefault();
              choose(record);
            }}
            onMouseMove={() => setActive(i)}
          >
            <img
              src={record.countryInfo.flag}
              alt=""
              width={20}
              height={14}
              loading="lazy"
              onError={(e) => (e.currentTarget.style.visibility = "hidden")}
            />
            <span>{displayName(record)}</span>
          </li>
        ))}
        {results.length === 0 && (
          <li className="search__empty" role="presentation">
            No countries match “{query.trim()}”
          </li>
        )}
      </ul>

      {recentRecords.length > 0 && !expanded && (
        <div className="recent">
          <span className="recent__label" id={`${id}-recent`}>
            Recent
          </span>
          <ul className="recent__chips" aria-labelledby={`${id}-recent`}>
            {recentRecords.map((record) => (
              <li key={record.country}>
                <button type="button" className="chip" onClick={() => onSelect(record)}>
                  {displayName(record)}
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="link-button recent__clear" onClick={onClearRecent}>
            Clear
          </button>
        </div>
      )}
    </div>
  );
});

export default CountrySearch;
