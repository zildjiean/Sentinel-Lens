interface RiskMatrixProps {
  currentThreat?: { likelihood: number; impact: number };
}

const likelihoods = ["Rare", "Possible", "Likely", "Certain"];
const impacts = ["Low", "Medium", "High", "Critical"];

function getCellColor(li: number, im: number): string {
  const score = li + im; // 0-6 range
  if (score <= 1) return "bg-secondary/20 text-secondary";
  if (score <= 2) return "bg-secondary/10 text-secondary";
  if (score <= 3) return "bg-tertiary/20 text-tertiary";
  if (score <= 4) return "bg-tertiary/30 text-tertiary";
  if (score <= 5) return "bg-error/40 text-error";
  return "bg-error/80 text-error";
}

export function RiskMatrix({ currentThreat }: RiskMatrixProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="p-2 text-left text-on-surface-variant font-medium">
              Likelihood / Impact
            </th>
            {impacts.map((imp) => (
              <th
                key={imp}
                className="p-2 text-center text-on-surface-variant font-medium"
              >
                {imp}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {likelihoods.map((lh, li) => (
            <tr key={lh}>
              <td className="p-2 text-on-surface-variant font-medium">{lh}</td>
              {impacts.map((_, im) => {
                const isActive =
                  currentThreat?.likelihood === li &&
                  currentThreat?.impact === im;
                return (
                  <td key={im} className="p-1">
                    <div
                      className={`rounded-lg p-3 text-center font-semibold ${getCellColor(
                        li,
                        im
                      )} ${
                        isActive
                          ? "ring-2 ring-on-surface ring-offset-2 ring-offset-surface"
                          : ""
                      }`}
                    >
                      {isActive ? "X" : ""}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
