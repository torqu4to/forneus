"""Optimization from saved individual catpal levels."""
from collections import Counter, defaultdict

from ...contract import ToolError
from .data import (DISPLAY_NAMES, EFFECTIVENESS_RATE, TABLES,
                   MAX_TEAM_SIZE as MAX_CATPALS, MAX_SAFE_INTEGER)
from .optimizer import _solve, cumulative_options, optimize


def _validated_catpals(profile, new_jelly):
    if type(new_jelly) is not int or not 0 <= new_jelly <= MAX_SAFE_INTEGER:
        raise ToolError('error.new_jelly.range', max=MAX_SAFE_INTEGER)
    if not isinstance(profile, dict) or not isinstance(profile.get('catpals'), list):
        raise ToolError('error.profile.shape')
    catpals = profile['catpals']
    if len(catpals) > MAX_CATPALS:
        raise ToolError('error.profile.too_large', max=MAX_CATPALS)
    ids = []
    for catpal in catpals:
        if not isinstance(catpal, dict):
            raise ToolError('error.profile.entry_shape')
        catpal_id = catpal.get('id')
        key = catpal.get('catpal_type')
        level = catpal.get('current_level')
        if not isinstance(catpal_id, str) or not catpal_id:
            raise ToolError('error.profile.id_missing')
        if key not in TABLES:
            raise ToolError('error.category.unknown', category=key)
        if level not in [row[0] for row in TABLES[key]]:
            raise ToolError('error.profile.level_invalid', level=level,
                            display_name=DISPLAY_NAMES[key])
        if not isinstance(catpal.get('name', ''), str):
            raise ToolError('error.profile.name_type')
        ids.append(catpal_id)
    if len(ids) != len(set(ids)):
        raise ToolError('error.profile.id_duplicated')
    return catpals


def _options(key):
    options, entry_cost = cumulative_options(TABLES[key], EFFECTIVENESS_RATE[key])
    return options, entry_cost


def _choose(items, budget):
    best = [max(options, key=lambda option: (option[1], -option[0]))
            for _, options in items]
    return best if sum(option[0] for option in best) <= budget else _solve(items, budget)


def _allocation(catpal, option, jelly_change):
    cost, effective, raw, level = option
    return {
        'id': catpal['id'], 'name': catpal.get('name', ''),
        'catpal_type': catpal['catpal_type'],
        'display_name': DISPLAY_NAMES[catpal['catpal_type']],
        'current_level': catpal['current_level'], 'target_level': level,
        'from_level': catpal['current_level'], 'to_level': level,
        'jelly_change': jelly_change, 'target_invested_jelly': cost,
        'raw_power': raw, 'effective_power': effective,
    }


def optimize_profile(profile, new_jelly):
    """Compare upgrades in place with a free, full-refund redistribution."""
    catpals = _validated_catpals(profile, new_jelly)
    current_rows = []
    current_invested = 0
    current_effective = 0.0
    current_raw = 0.0
    keep_items = []
    current_absolute_cost = {}

    for catpal in catpals:
        key = catpal['catpal_type']
        options, entry = _options(key)
        index = [option[3] for option in options].index(catpal['current_level'])
        current = options[index]
        absolute = entry + current[0]
        current_absolute_cost[catpal['id']] = absolute
        current_invested += absolute
        current_effective += current[1]
        current_raw += current[2]
        current_rows.append(_allocation(catpal, current, 0))
        incremental = [(cost - current[0], eff, raw, level)
                       for cost, eff, raw, level in options[index:]]
        keep_items.append((catpal['id'], incremental))

    keep_chosen = _choose(keep_items, new_jelly) if keep_items else []
    keep_allocations = []
    for catpal, chosen in zip(catpals, keep_chosen):
        delta, effective, raw, level = chosen
        absolute = current_absolute_cost[catpal['id']] + delta
        keep_allocations.append(_allocation(
            catpal, (absolute, effective, raw, level), delta))
    keep_spent = sum(item['jelly_change'] for item in keep_allocations)
    keep = {
        'available_jelly': new_jelly,
        'additional_jelly_spent': keep_spent,
        'jelly_leftover': new_jelly - keep_spent,
        'total_effective_power': sum(item['effective_power'] for item in keep_allocations),
        'total_raw_power': sum(item['raw_power'] for item in keep_allocations),
        'allocations': keep_allocations,
        'changes': [item for item in keep_allocations
                    if item['target_level'] != item['current_level']],
    }

    total_after_refund = current_invested + new_jelly
    counts = dict(Counter(catpal['catpal_type'] for catpal in catpals))
    reset = optimize(counts, total_after_refund)
    targets = defaultdict(list)
    for allocation in reset.allocations:
        targets[allocation.catpal_type].append(allocation)
    redistributed = []
    for key in TABLES:
        source = sorted((catpal for catpal in catpals if catpal['catpal_type'] == key),
                        key=lambda item: [row[0] for row in TABLES[key]].index(item['current_level']))
        target = sorted(targets[key], key=lambda item: [row[0] for row in TABLES[key]].index(item.level))
        for catpal, allocation in zip(source, target):
            old_cost = current_absolute_cost[catpal['id']]
            redistributed.append(_allocation(
                catpal,
                (allocation.cost, allocation.effective_power,
                 allocation.raw_power, allocation.level),
                allocation.cost - old_cost,
            ))
    redistribute = {
        'available_jelly': total_after_refund,
        'additional_jelly_spent': reset.total_cost - current_invested,
        'jelly_leftover': reset.jelly_leftover,
        'total_effective_power': reset.total_effective_power,
        'total_raw_power': reset.total_raw_power,
        'allocations': redistributed,
        'changes': [item for item in redistributed
                    if item['target_level'] != item['current_level']],
    }
    return {
        'profile_name': profile.get('name', ''), 'new_jelly': new_jelly,
        'current': {'invested_jelly': current_invested,
                    'total_effective_power': current_effective,
                    'total_raw_power': current_raw,
                    'allocations': current_rows},
        'keep': keep, 'redistribute': redistribute,
        'recommendation': ('redistribute' if redistribute['total_effective_power']
                           > keep['total_effective_power'] else 'keep'),
    }
