#!/usr/bin/python3

import argparse
import sys
import time

import gi

gi.require_version('Atspi', '2.0')
from gi.repository import Atspi, GLib


def children(node):
    try:
        return [node.get_child_at_index(index) for index in range(node.get_child_count())]
    except GLib.Error:
        return []


def walk(node, depth=0):
    yield node, depth
    for child in children(node):
        if child is not None:
            yield from walk(child, depth + 1)


def description(node):
    try:
        return node.get_name() or '', node.get_role_name() or ''
    except GLib.Error:
        return '', ''


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--activate', action='store_true')
    parser.add_argument('--click', action='store_true')
    parser.add_argument('--inspect', action='store_true')
    parser.add_argument('--mouse-event', default='b1c')
    parser.add_argument('--all', action='store_true')
    parser.add_argument('--target', default='iWeather')
    parser.add_argument('--x', type=int)
    parser.add_argument('--y', type=int)
    args = parser.parse_args()

    if Atspi.init() != 0:
        raise RuntimeError('AT-SPI initialization failed')

    desktop = Atspi.get_desktop(0)
    if args.x is not None or args.y is not None:
        if args.x is None or args.y is None:
            parser.error('--x and --y must be used together')
        if Atspi.generate_mouse_event(args.x, args.y, args.mouse_event):
            print(f'mouse-event\t{args.mouse_event}\t{args.x}\t{args.y}')
            time.sleep(0.4)
            return 0
        print(f'Mouse event failed at {args.x},{args.y}', file=sys.stderr)
        return 4

    matches = []
    needles = ('iweather', 'weather', 'погод', 'сормов', '°c', '°f', 'прогноз')
    for application in children(desktop):
        for node, depth in walk(application):
            name, role = description(node)
            if args.all or any(needle in name.lower() for needle in needles):
                print(f'{depth:02d}\t{role}\t{name}')
            if args.target.casefold() == name.casefold():
                matches.append(node)

    if not args.activate and not args.click and not args.inspect:
        return 0
    if not matches:
        print(f'No accessibility node found for {args.target!r}', file=sys.stderr)
        return 2

    for node in matches:
        if args.inspect:
            current = node
            depth = 0
            while current is not None and depth < 12:
                name, role = description(current)
                component = current.get_component_iface()
                if component is not None:
                    rect = component.get_extents(Atspi.CoordType.SCREEN)
                    state = current.get_state_set()
                    visible = state.contains(Atspi.StateType.VISIBLE)
                    showing = state.contains(Atspi.StateType.SHOWING)
                    print(f'ancestor\t{depth}\t{role}\t{name}\t{rect.x}\t{rect.y}\t{rect.width}\t{rect.height}\tvisible={visible}\tshowing={showing}')
                try:
                    current = current.get_parent()
                except GLib.Error:
                    current = None
                depth += 1
            return 0
        if args.click:
            component = node.get_component_iface()
            if component is None:
                continue
            rect = component.get_extents(Atspi.CoordType.SCREEN)
            print(f'extents\t{rect.x}\t{rect.y}\t{rect.width}\t{rect.height}')
            if rect.width > 0 and rect.height > 0:
                x = rect.x + rect.width // 2
                y = rect.y + rect.height // 2
                if Atspi.generate_mouse_event(x, y, args.mouse_event):
                    print(f'mouse-event\t{args.mouse_event}')
                    time.sleep(0.4)
                    return 0
        action = node.get_action_iface()
        if action is None:
            continue
        for index in range(action.get_n_actions()):
            print(f'action\t{index}\t{action.get_name(index)}')
        if action.get_n_actions() > 0 and action.do_action(0):
            print('activated')
            return 0

    print('iWeather node has no usable action', file=sys.stderr)
    return 3


if __name__ == '__main__':
    raise SystemExit(main())
