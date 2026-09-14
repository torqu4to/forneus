"""
Command-line interface for the Forneus amigatos optimizer.

    python -m forneus_core.tools.amigatos
    forneus-amigatos --purple 5 --gold_r1 5 --gold_r2 4 --red_r1 1 --red_r2 1 --jelly 43671

The --jelly value should be your total Fish Jelly r1 amount AFTER converting
everything (r1 + r2 jelly) into r1 - see the README "Usage guide" section.
"""

import argparse

from .optimizer import optimize
from .report import format_report


def main():
    parser = argparse.ArgumentParser(
        description="Forneus amigatos optimizer - optimal Fish Jelly allocation for catpals in assist slots."
    )
    parser.add_argument("--purple", type=int, help="Number of Purple r1 catpals equipped in assist slots")
    parser.add_argument("--gold_r1", type=int, help="Number of Gold r1 catpals equipped in assist slots")
    parser.add_argument("--gold_r2", type=int, help="Number of Gold r2 catpals equipped in assist slots")
    parser.add_argument("--red_r1", type=int, help="Number of Red r1 catpals equipped in assist slots")
    parser.add_argument("--red_r2", type=int, help="Number of Red r2 catpals equipped in assist slots")
    parser.add_argument("--jelly", type=int,
                         help="Total Fish Jelly r1 available (after converting all r1+r2 jelly into r1)")
    parser.add_argument("--no-pause", action="store_true",
                         help="Don't wait for Enter before exiting (useful for scripts/CI)")
    args = parser.parse_args()

    qty_purple = args.purple if args.purple is not None else int(input("How many Purple r1 catpals (in assist slots)? "))
    qty_gold_r1 = args.gold_r1 if args.gold_r1 is not None else int(input("How many Gold r1 catpals (in assist slots)? "))
    qty_gold_r2 = args.gold_r2 if args.gold_r2 is not None else int(input("How many Gold r2 catpals (in assist slots)? "))
    qty_red_r1 = args.red_r1 if args.red_r1 is not None else int(input("How many Red r1 catpals (in assist slots)? "))
    qty_red_r2 = args.red_r2 if args.red_r2 is not None else int(input("How many Red r2 catpals (in assist slots)? "))
    total_jelly = args.jelly if args.jelly is not None else int(
        input("Total Fish Jelly r1 available (after converting r1+r2 into r1)? ")
    )

    counts = {
        "Purple": qty_purple,
        "GoldR1": qty_gold_r1,
        "GoldR2": qty_gold_r2,
        "RedR1": qty_red_r1,
        "RedR2": qty_red_r2,
    }

    try:
        result = optimize(counts, total_jelly)
    except ValueError as exc:
        print(f"ERROR: {exc}")
        return

    print(format_report(result, counts))

    if not args.no_pause:
        input("\nPress Enter to exit...")


if __name__ == "__main__":
    main()
